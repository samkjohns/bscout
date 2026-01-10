"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type Business = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  website: string | null;
  tags: string[];
  owner?: {
    name: string | null;
    email: string;
  };
};

type Scope = "mine" | "all";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTag, setSearchTag] = useState("");
  const [scope, setScope] = useState<Scope>("mine");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    website: "",
    tags: ""
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [signinForm, setSigninForm] = useState({
    email: "",
    password: ""
  });
  const [businessForm, setBusinessForm] = useState({
    name: "",
    description: "",
    website: "",
    tags: ""
  });

  const fetchBusinesses = async (tag?: string, scopeOverride?: Scope) => {
    const currentScope = scopeOverride ?? scope;
    setLoading(true);
    setError(null);
    try {
      const base =
        currentScope === "all" ? "/api/businesses/all" : "/api/businesses";
      const query = tag ? `?tag=${encodeURIComponent(tag)}` : "";
      const response = await fetch(`${base}${query}`);
      if (!response.ok) {
        throw new Error("Failed to load businesses.");
      }
      const data = await response.json();
      setBusinesses(data.businesses ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchBusinesses("", scope);
    }
  }, [session?.user?.id]);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerForm)
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Registration failed.");
      return;
    }

    const signInResult = await signIn("credentials", {
      redirect: false,
      email: registerForm.email,
      password: registerForm.password
    });

    if (signInResult?.error) {
      setError("Account created, but sign in failed. Try again.");
    }
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email: signinForm.email,
      password: signinForm.password
    });

    if (result?.error) {
      setError("Invalid email or password.");
    }
  };

  const handleAddBusiness = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const tags = businessForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: businessForm.name,
        description: businessForm.description,
        website: businessForm.website,
        tags
      })
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not save business.");
      return;
    }

    setBusinessForm({ name: "", description: "", website: "", tags: "" });
    fetchBusinesses(searchTag, scope);
  };

  const handleEdit = (business: Business) => {
    setEditingId(business.id);
    setEditForm({
      name: business.name,
      description: business.description ?? "",
      website: business.website ?? "",
      tags: business.tags.join(", ")
    });
  };

  const handleUpdateBusiness = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);

    const tags = editForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch(`/api/businesses/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description,
        website: editForm.website,
        tags
      })
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not update business.");
      return;
    }

    setEditingId(null);
    setEditForm({ name: "", description: "", website: "", tags: "" });
    fetchBusinesses(searchTag, scope);
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    fetchBusinesses(searchTag, scope);
  };

  if (status === "loading") {
    return <p>Loading session...</p>;
  }

  if (!session) {
    return (
      <div className="grid grid-2">
        <div className="card">
          <h2>Sign in</h2>
          <p>Pick up where you left off.</p>
          <form className="grid" onSubmit={handleSignIn}>
            <div>
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                value={signinForm.email}
                onChange={(event) =>
                  setSigninForm({ ...signinForm, email: event.target.value })
                }
                required
              />
            </div>
            <div>
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                value={signinForm.password}
                onChange={(event) =>
                  setSigninForm({ ...signinForm, password: event.target.value })
                }
                required
              />
            </div>
            <button type="submit">Sign in</button>
          </form>
        </div>

        <div className="card">
          <h2>Create an account</h2>
          <p>Build your own tagged business library.</p>
          <form className="grid" onSubmit={handleRegister}>
            <div>
              <label htmlFor="register-name">Name</label>
              <input
                id="register-name"
                type="text"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    name: event.target.value
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    email: event.target.value
                  })
                }
                required
              />
            </div>
            <div>
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    password: event.target.value
                  })
                }
                required
              />
            </div>
            <button type="submit">Create account</button>
          </form>
        </div>
        {error ? <p>{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="header">
        <div>
          <h2>Welcome back, {session.user.name || session.user.email}.</h2>
          <p>Track businesses and discover them by tag.</p>
        </div>
        <button className="secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Add a business</h3>
          <form className="grid" onSubmit={handleAddBusiness}>
            <div>
              <label htmlFor="biz-name">Business name</label>
              <input
                id="biz-name"
                type="text"
                value={businessForm.name}
                onChange={(event) =>
                  setBusinessForm({
                    ...businessForm,
                    name: event.target.value
                  })
                }
                required
              />
            </div>
            <div>
              <label htmlFor="biz-description">Description</label>
              <textarea
                id="biz-description"
                rows={3}
                value={businessForm.description}
                onChange={(event) =>
                  setBusinessForm({
                    ...businessForm,
                    description: event.target.value
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="biz-website">Website</label>
              <input
                id="biz-website"
                type="url"
                value={businessForm.website}
                onChange={(event) =>
                  setBusinessForm({
                    ...businessForm,
                    website: event.target.value
                  })
                }
                placeholder="https://"
              />
            </div>
            <div>
              <label htmlFor="biz-tags">Tags</label>
              <input
                id="biz-tags"
                type="text"
                value={businessForm.tags}
                onChange={(event) =>
                  setBusinessForm({
                    ...businessForm,
                    tags: event.target.value
                  })
                }
                placeholder="coffee, wifi, pastries"
              />
            </div>
            <button type="submit">Save business</button>
          </form>
        </div>

        <div className="card">
          <h3>Search by tag</h3>
          <form className="grid" onSubmit={handleSearch}>
            <div>
              <label>Browse scope</label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={scope === "mine" ? "" : "secondary"}
                  onClick={() => {
                    setScope("mine");
                    fetchBusinesses(searchTag, "mine");
                  }}
                >
                  My businesses
                </button>
                <button
                  type="button"
                  className={scope === "all" ? "" : "secondary"}
                  onClick={() => {
                    setScope("all");
                    fetchBusinesses(searchTag, "all");
                  }}
                >
                  All businesses
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="search-tag">Tag</label>
              <input
                id="search-tag"
                type="text"
                value={searchTag}
                onChange={(event) => setSearchTag(event.target.value)}
                placeholder="wifi"
              />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit">Search</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSearchTag("");
                    fetchBusinesses("", scope);
                  }}
                >
                  Clear
                </button>
              </div>
          </form>
        </div>
      </div>

      <div className="card">
        <h3>{scope === "all" ? "All businesses" : "Your businesses"}</h3>
        {loading ? <p>Loading...</p> : null}
        {error ? <p>{error}</p> : null}
        {!loading && businesses.length === 0 ? (
          <p>No businesses yet. Add one to get started.</p>
        ) : (
          <div className="list">
            {businesses.map((business) => (
              <div key={business.id} className="business">
                {editingId === business.id ? (
                  <form className="grid" onSubmit={handleUpdateBusiness}>
                    <div>
                      <label htmlFor={`edit-name-${business.id}`}>
                        Business name
                      </label>
                      <input
                        id={`edit-name-${business.id}`}
                        type="text"
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            name: event.target.value
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-description-${business.id}`}>
                        Description
                      </label>
                      <textarea
                        id={`edit-description-${business.id}`}
                        rows={3}
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            description: event.target.value
                          })
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-website-${business.id}`}>
                        Website
                      </label>
                      <input
                        id={`edit-website-${business.id}`}
                        type="url"
                        value={editForm.website}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            website: event.target.value
                          })
                        }
                        placeholder="https://"
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-tags-${business.id}`}>Tags</label>
                      <input
                        id={`edit-tags-${business.id}`}
                        type="text"
                        value={editForm.tags}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            tags: event.target.value
                          })
                        }
                        placeholder="coffee, wifi, pastries"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button type="submit">Save changes</button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({
                            name: "",
                            description: "",
                            website: "",
                            tags: ""
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{business.name}</strong>
                      {business.website ? (
                        <span>
                          {" "}
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {business.website}
                          </a>
                        </span>
                      ) : null}
                    </div>
                    {business.owner ? (
                      <p>
                        Added by {business.owner.name || business.owner.email}
                      </p>
                    ) : null}
                    {business.description ? <p>{business.description}</p> : null}
                    {business.tags.length ? (
                      <div className="tags">
                        {business.tags.map((tag) => (
                          <span key={tag} className="badge">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>No tags yet.</p>
                    )}
                    {business.ownerId === session.user.id ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => handleEdit(business)}
                      >
                        Edit business
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
