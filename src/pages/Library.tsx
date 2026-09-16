import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getLibraryCategories, getLibraryDocuments } from "../lib/api";
import { categoryBg, categoryColor } from "../lib/library-categories";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

export function Library() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedYear, setSelectedYear] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const categoriesQuery = useQuery({ queryKey: ["library", "categories"], queryFn: getLibraryCategories });
  const docsQuery = useQuery({
    queryKey: ["library", "documents", selectedCategory, selectedYear, debouncedSearch],
    queryFn: () => getLibraryDocuments(selectedCategory || null, selectedYear || null, debouncedSearch || null),
  });

  const categories = categoriesQuery.data ?? [];
  const documents = docsQuery.data ?? [];
  const errorMessage = docsQuery.error instanceof ApiError ? docsQuery.error.message : "Could not load library.";

  return (
    <div className="r-page">
      <div className="r-page-head">
        <h1 className="r-page-title">Intelligence Library</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 4 }}>
          Curated authoritative reports, flagship publications, and research documents.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: "9px 14px",
            border: "1.5px solid rgba(20,24,31,.12)",
            borderRadius: 9,
            fontSize: 13.5,
            background: "#fff",
            color: "#14181f",
            outline: "none",
          }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: "9px 14px", border: "1.5px solid rgba(20,24,31,.12)", borderRadius: 9, fontSize: 13.5, background: "#fff", color: "#14181f" }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{ padding: "9px 14px", border: "1.5px solid rgba(20,24,31,.12)", borderRadius: 9, fontSize: 13.5, background: "#fff", color: "#14181f" }}
        >
          <option value={0}>All Years</option>
          {YEARS.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {categories.length > 0 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 22 }}>
          <button className={`r-chip ${!selectedCategory ? "active" : ""}`} onClick={() => setSelectedCategory("")}>
            All
          </button>
          {categories.map((cat) => (
            <button key={cat} className={`r-chip ${selectedCategory === cat ? "active" : ""}`} onClick={() => setSelectedCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {docsQuery.isLoading ? (
        <LoadingSkeleton variant="feed" count={6} />
      ) : docsQuery.isError ? (
        <ErrorState title="Could not load library" description={errorMessage} onRetry={() => docsQuery.refetch()} />
      ) : documents.length === 0 ? (
        <EmptyState icon="📚" title="No documents found" description="Try adjusting your search or category filter." />
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14, fontWeight: 600 }}>
            {documents.length} document{documents.length === 1 ? "" : "s"}
          </div>

          {documents.map((doc) => (
            <div key={doc.id} style={{ background: "#fff", border: "1.5px solid rgba(20,24,31,.08)", borderRadius: 13, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: categoryColor(doc.category),
                    background: categoryBg(doc.category),
                    borderRadius: 5,
                    padding: "3px 8px",
                  }}
                >
                  {doc.category}
                </span>
                {doc.isAfrica && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", color: "#008c93", background: "#e0f4f6", borderRadius: 5, padding: "3px 8px" }}>
                    Africa
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginLeft: "auto" }}>{doc.year}</span>
              </div>

              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#14181f", lineHeight: 1.35, marginBottom: 5 }}>{doc.title}</div>

              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>
                {doc.publisher} · {doc.documentType}
              </div>

              {doc.subtopic && <div style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5, marginBottom: 10 }}>{doc.subtopic}</div>}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500 }}>📍 {doc.region}</span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cyan)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  Access document →
                </a>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
