// PHP executes this file; a direct URL never prints the teaching data.
export function privateCatalogPHP(catalog) {
  const payload=Buffer.from(JSON.stringify(catalog),'utf8').toString('base64');
  return `<?php
// Private conjugation data. Include only after the existing account access check.
if (!defined('ABSPATH') || !function_exists('HebleoConjugation\\\\allowed') || !\\HebleoConjugation\\allowed()) {
    http_response_code(404);
    exit;
}
return json_decode(base64_decode('${payload}'), true);
`;
}
