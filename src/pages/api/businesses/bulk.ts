import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import formidable from "formidable";
import { readFile } from "node:fs/promises";
import xlsx from "xlsx";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeTags } from "@/lib/tagging";

type ParsedBusiness = {
  name?: string;
  description?: string | null;
  website?: string | null;
  tags?: string[] | string;
};

type ResponseData =
  | { error: string }
  | {
      created: number;
      skipped: number;
      errors: string[];
      preview?: ParsedBusiness[];
      totalParsed?: number;
    };

export const config = {
  api: {
    bodyParser: false
  }
};

function extractJsonArray(text: string) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  return match[0];
}

function rowsToPreview(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => String(cell).slice(0, 120)))
    .map((row) => row.join(" | "))
    .join("\n");
}

async function parseSpreadsheet(buffer: Buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [] as string[][];
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: ""
  }) as string[][];

  return rows;
}

async function callOpenAI(rows: string[][]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const preview = rowsToPreview(rows.slice(0, 120));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text:
                "You are extracting business records from a spreadsheet preview. Return only valid JSON."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Analyze the spreadsheet rows and return a JSON array. Each item must have: name (string), description (string or null), website (string or null), tags (array of strings). Infer the correct columns even if there are no headers. If a field is missing, use null or an empty array. Output only JSON.\n\n" +
                preview
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const data = await response.json();
  const text =
    data.output?.[0]?.content?.[0]?.text ??
    data.output_text ??
    JSON.stringify(data);

  const jsonText = extractJsonArray(text);
  if (!jsonText) {
    throw new Error("OpenAI response did not include JSON.");
  }

  return JSON.parse(jsonText) as ParsedBusiness[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const form = formidable({
    multiples: false,
    maxFileSize: 5 * 1024 * 1024
  });

  const { files } = await new Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
  }>((resolve, reject) => {
    form.parse(req, (err, fields, parsedFiles) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files: parsedFiles });
    });
  });

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file || !file.filepath) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const buffer = await readFile(file.filepath);
  const rows = await parseSpreadsheet(buffer);

  if (!rows.length) {
    return res.status(400).json({ error: "Spreadsheet appears to be empty." });
  }

  let parsedBusinesses: ParsedBusiness[] = [];

  try {
    parsedBusinesses = await callOpenAI(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return res.status(500).json({ error: message });
  }

  if (req.query.preview === "true") {
    return res.status(200).json({
      created: 0,
      skipped: 0,
      errors: [],
      preview: parsedBusinesses.slice(0, 10),
      totalParsed: parsedBusinesses.length
    });
  }

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const entry of parsedBusinesses.slice(0, 200)) {
    const name = entry.name?.trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const tagsRaw =
      Array.isArray(entry.tags) ? entry.tags : entry.tags ? [entry.tags] : [];
    const tags = normalizeTags(tagsRaw.map((tag) => String(tag)));

    try {
      await prisma.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: {
            name,
            description: entry.description?.trim() || null,
            website: entry.website?.trim() || null,
            ownerId: session.user.id
          }
        });

        for (const tagName of tags) {
          const tagRecord = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName }
          });

          await tx.businessTag.create({
            data: {
              businessId: business.id,
              tagId: tagRecord.id
            }
          });
        }
      });

      created += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          skipped += 1;
          continue;
        }
      }
      errors.push(`Failed to import ${name}.`);
    }
  }

  return res.status(200).json({ created, skipped, errors });
}
