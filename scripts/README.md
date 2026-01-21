# Importer scripts

Run the Essentials 4x template importer:

```bash
npm install
npm run import:essentials -- --write-json

# Insert into Supabase (requires env vars)
npm run import:essentials -- --write-json --push-db

# Re-import (delete existing template first)
npm run import:essentials -- --write-json --push-db --force
```

Env vars for DB insert:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Tip: keep secrets in a gitignored `.env`.
