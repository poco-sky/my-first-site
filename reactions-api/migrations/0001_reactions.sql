CREATE TABLE IF NOT EXISTS reactions (
    kind TEXT NOT NULL CHECK (kind IN ('music', 'blog')),
    content_id TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,
    emoji TEXT NOT NULL CHECK (emoji IN ('like','love','fire','moved','sparkles')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kind, content_id, visitor_hash, emoji)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS reactions_counts ON reactions(kind, content_id, emoji);
