import { dedupeDomainBySourceUrl } from "../lib/signal-dedupe";

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: npx tsx scripts/dedupe-signals-by-url.ts <domain-slug>");
  process.exit(1);
}

dedupeDomainBySourceUrl(slug)
  .then((summary) => {
    console.log(JSON.stringify({ ok: true, domain: slug, ...summary }));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
