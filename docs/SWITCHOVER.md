# Switchover to grhappenings.com
1. Merge this branch to main (Pages deploys it; the in-page script then sends github.io, www and *.pages.dev visitors to https://grhappenings.com keeping path, query and hash).
2. Redeploy Worker: `cd worker && npx wrangler deploy` (SITE_URL -> https://grhappenings.com/).
3. www -> apex 301 at the edge (Pages _redirects can't match on hostname): add a zone Single Redirect rule
   in grhappenings.com: when `http.host eq "www.grhappenings.com"`, dynamic redirect to
   `concat("https://grhappenings.com", http.request.uri.path)`, 301, preserve query string.
4. Submit https://grhappenings.com/sitemap.xml in Google Search Console; update GoatCounter allowed sites if restricted.
