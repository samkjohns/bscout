const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const adjectives = [
  "Golden",
  "Urban",
  "Bright",
  "Copper",
  "Coastal",
  "Hidden",
  "Lively",
  "Ever",
  "Harbor",
  "Wild",
  "Maple",
  "Sunny"
];

const nouns = [
  "Coffee",
  "Bakery",
  "Studio",
  "Workshop",
  "Market",
  "Garden",
  "Kitchen",
  "Books",
  "Roastery",
  "Tavern",
  "Gallery",
  "Supply"
];

const suffixes = ["Co", "House", "Lab", "Collective", "& Co.", "Works"];

const tagPool = [
  "coffee",
  "wifi",
  "pet-friendly",
  "vegan",
  "outdoor",
  "late-night",
  "pastries",
  "family",
  "local",
  "work-friendly",
  "craft",
  "takeout"
];

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function uniqueSample(list, count) {
  const pick = new Set();
  while (pick.size < count) {
    pick.add(sample(list));
  }
  return Array.from(pick);
}

async function main() {
  const email = "demo@bscout.test";
  const password = "demo1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Demo User", passwordHash },
    create: { name: "Demo User", email, passwordHash }
  });

  const existing = await prisma.business.count({
    where: { ownerId: user.id }
  });

  if (existing > 0) {
    console.log("Seed skipped: businesses already exist for demo user.");
    return;
  }

  for (let i = 0; i < 18; i += 1) {
    const name = `${sample(adjectives)} ${sample(nouns)} ${sample(suffixes)}`;
    const tags = uniqueSample(tagPool, 3 + (i % 3));

    await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name,
          description: "A neighborhood spot with a loyal following.",
          website: `https://example.com/${name
            .toLowerCase()
            .replace(/[^a-z]+/g, "-")}`,
          ownerId: user.id
        }
      });

      for (const tagName of tags) {
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName }
        });

        await tx.businessTag.create({
          data: {
            businessId: business.id,
            tagId: tag.id
          }
        });
      }
    });
  }
  console.log("Seeded demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
