const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'issue';
}

function issueId(parts) {
  const raw = parts.filter(Boolean).join('::');
  const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10);
  return `${slug(parts[0] || 'issue')}-${hash}`;
}

function parseJsonFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function summarizeIssues(issues) {
  const summary = {
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    top_issues: []
  };
  const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  for (const issue of issues) {
    const key = `${issue.severity}_count`;
    if (key in summary) summary[key] += 1;
  }
  summary.top_issues = issues
    .slice()
    .sort((a, b) => {
      const sev = severityWeight[b.severity] - severityWeight[a.severity];
      if (sev) return sev;
      return (b.confidence || 0) - (a.confidence || 0);
    })
    .slice(0, 3)
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      severity: issue.severity,
      viewport: issue.viewport,
      page_or_flow: issue.page_or_flow
    }));
  return summary;
}

function severityWeight(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
}

function issueFingerprint(issue) {
  const viewport = issue.viewport || '';
  const type = issue.type || '';
  const selector = issue.location && issue.location.selector ? issue.location.selector.replace(/:nth-match\(\d+\)/g, '') : '';
  const component = issue.location && issue.location.component ? issue.location.component : '';
  return [viewport, type, selector, component].join('::');
}

function compareAuditReports(previousReport, currentReport) {
  const previousList = (previousReport && previousReport.issues) || [];
  const currentList = (currentReport && currentReport.issues) || [];
  const previousIssues = new Map(previousList.map((issue) => [issue.id, issue]));
  const currentIssues = new Map(currentList.map((issue) => [issue.id, issue]));
  const previousByFingerprint = new Map(previousList.map((issue) => [issueFingerprint(issue), issue]));
  const currentFingerprints = new Set(currentList.map(issueFingerprint));
  const verification = [];

  for (const issue of currentReport.issues || []) {
    const previous = previousIssues.get(issue.id) || previousByFingerprint.get(issueFingerprint(issue));
    const currentSeverity = severityWeight(issue.severity);
    const previousSeverity = previous ? severityWeight(previous.severity) : 0;
    verification.push({
      issue_id: issue.id,
      status: previous
        ? (currentSeverity < previousSeverity ? 'partially_fixed' : 'not_fixed')
        : 'caused_regression',
      title: issue.title
    });
  }

  for (const issue of previousList) {
    if (!currentIssues.has(issue.id) && !currentFingerprints.has(issueFingerprint(issue))) {
      verification.push({
        issue_id: issue.id,
        status: 'fixed',
        title: issue.title
      });
    }
  }

  return verification;
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

module.exports = {
  ensureDir,
  issueId,
  parseJsonFile,
  summarizeIssues,
  compareAuditReports,
  issueFingerprint,
  writeJson
};
