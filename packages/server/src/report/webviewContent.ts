import type { ReportTreeData, EmojiConfig } from "./types";

export interface ReportHtmlOptions {
  data: ReportTreeData;
  emojis: EmojiConfig;
  theme?: "dark" | "light" | "auto";
  nonce?: string;
  headExtra?: string;
  scriptExtra?: string;
}

export function getReportHtml(options: ReportHtmlOptions): string {
  const { data, emojis, theme = "auto", nonce, headExtra = "", scriptExtra = "" } = options;
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  const dataJson = JSON.stringify(data);
  const emojisJson = JSON.stringify(emojis);
  const themeAttr = theme === "auto" ? "" : ` data-theme="${theme}"`;

  return `<!DOCTYPE html>
<html lang="en"${themeAttr}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>React Compiler Report</title>
  <style${nonceAttr}>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--rcm-font-family);
      font-size: var(--rcm-font-size);
      color: var(--rcm-foreground);
      background: var(--rcm-bg);
      padding: 16px;
    }

    .header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--rcm-border);
    }
    .header h1 {
      font-size: 1.4em;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .summary {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .stat-value {
      font-weight: 600;
    }
    .stat-label {
      opacity: 0.8;
    }
    .generated-at {
      opacity: 0.6;
      font-size: 0.85em;
    }
    .fix-with-ai {
      margin-top: 8px;
      background: var(--rcm-button-bg);
      color: var(--rcm-button-fg);
      border: none;
      padding: 6px 14px;
      border-radius: 2px;
      cursor: pointer;
      font-size: var(--rcm-font-size);
      font-family: var(--rcm-font-family);
    }
    .fix-with-ai:hover {
      background: var(--rcm-button-hover-bg);
    }

    .toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .toolbar select,
    .toolbar input {
      background: var(--rcm-input-bg);
      color: var(--rcm-input-fg);
      border: 1px solid var(--rcm-input-border);
      padding: 4px 8px;
      border-radius: 2px;
      font-size: var(--rcm-font-size);
      font-family: var(--rcm-font-family);
    }
    .toolbar input {
      flex: 1;
      min-width: 150px;
    }
    .toolbar input::placeholder {
      color: var(--rcm-input-placeholder);
    }
    .toolbar button {
      background: var(--rcm-button-bg);
      color: var(--rcm-button-fg);
      border: none;
      padding: 4px 10px;
      border-radius: 2px;
      cursor: pointer;
      font-size: var(--rcm-font-size);
      font-family: var(--rcm-font-family);
    }
    .toolbar button:hover {
      background: var(--rcm-button-hover-bg);
    }

    .tree {
      font-family: var(--rcm-editor-font-family);
      font-size: var(--rcm-editor-font-size);
    }
    .tree-node {
      user-select: none;
    }
    .tree-node.hidden {
      display: none;
    }
    .node-row {
      display: flex;
      align-items: center;
      padding: 2px 0;
      cursor: pointer;
      border-radius: 3px;
    }
    .node-row:hover {
      background: var(--rcm-list-hover-bg);
    }
    .toggle {
      width: 16px;
      text-align: center;
      flex-shrink: 0;
      opacity: 0.7;
    }
    .icon {
      width: 18px;
      text-align: center;
      flex-shrink: 0;
      margin-right: 4px;
    }
    .node-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-name {
      color: var(--rcm-foreground);
    }
    .file-name:hover {
      text-decoration: underline;
    }
    .folder-name {
      color: var(--rcm-foreground);
      font-weight: 500;
    }

    .counts {
      font-size: 0.85em;
      opacity: 0.7;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .children {
      overflow: hidden;
      padding-left: 24px;
    }
    .children.collapsed {
      display: none;
    }

    .file-details {
      padding-left: 24px;
    }
    .file-details.collapsed {
      display: none;
    }
    .detail-row {
      display: flex;
      align-items: baseline;
      padding: 1px 0;
      gap: 8px;
      cursor: pointer;
      border-radius: 3px;
      padding-right: 4px;
    }
    .detail-row:hover {
      background: var(--rcm-list-hover-bg);
      text-decoration: underline;
    }
    .detail-icon {
      flex-shrink: 0;
    }
    .detail-name {
      font-weight: 500;
      flex-shrink: 0;
    }
    .detail-reason {
      opacity: 0.7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .detail-loc {
      opacity: 0.5;
      font-size: 0.85em;
      flex-shrink: 0;
    }
    .success-text { color: var(--rcm-success); }
    .failed-text { color: var(--rcm-failed); }

    .errors-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--rcm-border);
    }
    .errors-section h2 {
      font-size: 1.1em;
      margin-bottom: 8px;
    }
    .error-item {
      padding: 4px 0;
      cursor: pointer;
      border-radius: 3px;
    }
    .error-item:hover {
      background: var(--rcm-list-hover-bg);
    }
    .error-path {
      font-weight: 500;
    }
    .error-message {
      opacity: 0.7;
      margin-left: 8px;
    }
  </style>
  ${headExtra}
</head>
<body>
  <div class="header">
    <h1>React Compiler Report</h1>
    <div class="summary" id="summary"></div>
    <div class="generated-at" id="generatedAt"></div>
    <button id="fixWithAI" class="fix-with-ai" title="Generate a markdown file with all failures for AI to fix">Fix with AI</button>
  </div>
  <div class="toolbar">
    <select id="statusFilter" title="Filter by status">
      <option value="all">All files</option>
      <option value="compiled">Compiled only</option>
      <option value="failed">Failed only</option>
    </select>
    <select id="errorTypeFilter" title="Filter by error type">
      <option value="">All error types</option>
    </select>
    <input type="text" id="searchInput" placeholder="Search files..." />
    <button id="expandAll" title="Expand all folders">Expand All</button>
    <button id="collapseAll" title="Collapse all folders and file details">Collapse All</button>
  </div>
  <div class="tree" id="tree"></div>
  <div class="errors-section" id="errorsSection"></div>

  <script${nonceAttr}>
    ${scriptExtra}

    var ideBridge = window.ideBridge || {
      postMessage: function(msg) { console.log('[RCM]', JSON.stringify(msg)); },
      getState: function() { try { return JSON.parse(sessionStorage.getItem('rcm-state') || '{}'); } catch(e) { return {}; } },
      setState: function(s) { try { sessionStorage.setItem('rcm-state', JSON.stringify(s)); } catch(e) {} }
    };

    var reportData = ${dataJson};
    var emojis = ${emojisJson};

    // Restore filter state
    var savedState = ideBridge.getState() || {};
    var filterState = {
      statusFilter: savedState.statusFilter || 'all',
      searchQuery: savedState.searchQuery || '',
      errorTypeFilter: savedState.errorTypeFilter || '',
    };

    function saveFilterState() {
      ideBridge.setState(filterState);
    }

    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function escapeAttr(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function postOpenFile(filePath, line, column) {
      ideBridge.postMessage({ type: 'openFile', path: filePath, line: line, column: column });
    }

    function renderSummary() {
      var t = reportData.totals;
      document.getElementById('summary').innerHTML =
        '<div class="stat"><span class="stat-value">' + t.filesScanned + '</span><span class="stat-label">scanned</span></div>' +
        '<div class="stat"><span class="stat-value success-text">' + t.successCount + ' ' + emojis.success + '</span><span class="stat-label">compiled</span></div>' +
        '<div class="stat"><span class="stat-value failed-text">' + t.failedCount + ' ' + emojis.error + '</span><span class="stat-label">failed</span></div>' +
        '<div class="stat"><span class="stat-value">' + t.filesWithResults + '</span><span class="stat-label">files with results</span></div>';
      document.getElementById('generatedAt').textContent = 'Generated: ' + new Date(reportData.generatedAt).toLocaleString();
    }

    function collectErrorTypes(node) {
      var types = new Set();
      function walk(n) {
        if (n.entries) {
          for (var i = 0; i < n.entries.length; i++) {
            var e = n.entries[i];
            if (e.kind === 'failure' && e.reason) types.add(e.reason);
          }
        }
        if (n.children) {
          for (var j = 0; j < n.children.length; j++) walk(n.children[j]);
        }
      }
      walk(node);
      return Array.from(types).sort();
    }

    function populateErrorTypeFilter() {
      var select = document.getElementById('errorTypeFilter');
      var types = collectErrorTypes(reportData.root);
      for (var i = 0; i < types.length; i++) {
        var opt = document.createElement('option');
        opt.value = types[i];
        opt.textContent = types[i];
        select.appendChild(opt);
      }
      select.value = filterState.errorTypeFilter;
    }

    function matchesFilter(node) {
      var sf = filterState.statusFilter;
      var sq = filterState.searchQuery.toLowerCase();
      var ef = filterState.errorTypeFilter;

      if (node.type === 'file') {
        if (sf === 'compiled' && node.successCount === 0) return false;
        if (sf === 'failed' && node.failedCount === 0) return false;
        if (sq && !node.path.toLowerCase().includes(sq)) return false;
        if (ef) {
          var hasMatchingError = node.entries && node.entries.some(function(e) {
            return e.kind === 'failure' && e.reason === ef;
          });
          if (!hasMatchingError) return false;
        }
        return true;
      }
      return true;
    }

    function hasVisibleDescendant(node) {
      if (node.type === 'file') return matchesFilter(node);
      if (!node.children) return false;
      return node.children.some(function(c) { return hasVisibleDescendant(c); });
    }

    function renderFileDetails(node, depth) {
      if (!node.entries || node.entries.length === 0) return '';
      var items = [];
      for (var i = 0; i < node.entries.length; i++) {
        var e = node.entries[i];
        var name = e.fnName;
        var line = e.line;
        var col = e.column || 0;
        var locText = line !== undefined ? ':' + line : '';
        var isSuccess = e.kind === 'success';

        if (!isSuccess && filterState.errorTypeFilter && e.reason !== filterState.errorTypeFilter) continue;

        var emoji = isSuccess ? emojis.success : emojis.error;
        var textClass = isSuccess ? 'success-text' : 'failed-text';
        var nameHtml = name ? '<span class="detail-name ' + textClass + '">' + escapeHtml(name) + '</span>' : '';
        var reasonHtml = !isSuccess && e.reason ? '<span class="detail-reason">' + escapeHtml(e.reason) + '</span>' : '';

        items.push(
          '<div class="detail-row" data-path="' + escapeAttr(node.path) + '" data-line="' + (line !== undefined ? line - 1 : '') + '" data-col="' + col + '">' +
          '<span class="detail-icon">' + emoji + '</span>' +
          nameHtml +
          reasonHtml +
          '<span class="detail-loc">' + escapeHtml(locText) + '</span>' +
          '</div>'
        );
      }
      if (items.length === 0) return '';
      return '<div class="file-details collapsed">' + items.join('') + '</div>';
    }

    function renderNode(node, depth) {
      if (!hasVisibleDescendant(node) && node.type === 'folder') return '';
      if (node.type === 'file' && !matchesFilter(node)) return '';

      var isFolder = node.type === 'folder';
      var toggleIcon = isFolder ? '\\u25B6' : '';
      var nodeIcon = isFolder ? '\\uD83D\\uDCC1' : '\\uD83D\\uDCC4';
      var nameClass = isFolder ? 'folder-name' : 'file-name';

      var html = '<div class="tree-node" data-type="' + node.type + '">';
      html += '<div class="node-row">';
      html += '<span class="toggle">' + toggleIcon + '</span>';
      html += '<span class="icon">' + nodeIcon + '</span>';
      html += '<span class="node-name ' + nameClass + '" data-path="' + escapeAttr(node.path) + '">' + escapeHtml(node.name) + '</span>';
      var countsHtml = '';
      if (node.successCount > 0) countsHtml += node.successCount + emojis.success;
      if (node.successCount > 0 && node.failedCount > 0) countsHtml += ' ';
      if (node.failedCount > 0) countsHtml += node.failedCount + emojis.error;
      if (countsHtml) html += '<span class="counts">' + countsHtml + '</span>';
      html += '</div>';

      if (isFolder && node.children) {
        html += '<div class="children collapsed">';
        for (var i = 0; i < node.children.length; i++) {
          html += renderNode(node.children[i], depth + 1);
        }
        html += '</div>';
      } else if (!isFolder) {
        html += renderFileDetails(node, depth);
      }

      html += '</div>';
      return html;
    }

    function renderTree() {
      var treeEl = document.getElementById('tree');
      var html = '';
      if (reportData.root.children) {
        for (var i = 0; i < reportData.root.children.length; i++) {
          html += renderNode(reportData.root.children[i], 0);
        }
      }
      treeEl.innerHTML = html || '<div style="opacity:0.6;padding:8px;">No matching files found.</div>';
      attachTreeListeners();
    }

    function renderErrors() {
      var section = document.getElementById('errorsSection');
      if (!reportData.errors || reportData.errors.length === 0) {
        section.style.display = 'none';
        return;
      }
      var html = '<h2>Errors (' + reportData.errors.length + ')</h2>';
      for (var i = 0; i < reportData.errors.length; i++) {
        var err = reportData.errors[i];
        html += '<div class="error-item" data-path="' + escapeAttr(err.path) + '">' +
          '<span class="error-path">' + escapeHtml(err.path) + '</span>' +
          '<span class="error-message">' + escapeHtml(err.message) + '</span>' +
          '</div>';
      }
      section.innerHTML = html;
      section.querySelectorAll('.error-item').forEach(function(el) {
        el.addEventListener('click', function() {
          postOpenFile(el.dataset.path);
        });
      });
    }

    function attachTreeListeners() {
      document.querySelectorAll('.node-row').forEach(function(row) {
        row.addEventListener('click', function(e) {
          var treeNode = row.parentElement;
          var type = treeNode.dataset.type;

          if (type === 'folder') {
            var children = treeNode.querySelector(':scope > .children');
            var toggle = row.querySelector('.toggle');
            if (children) {
              var isCollapsed = children.classList.toggle('collapsed');
              toggle.textContent = isCollapsed ? '\\u25B6' : '\\u25BC';
            }
            updateCollapseCount();
          } else {
            var details = treeNode.querySelector(':scope > .file-details');
            if (details) {
              var detailRows = details.querySelectorAll('.detail-row');
              if (detailRows.length === 1) {
                var dr = detailRows[0];
                var path = dr.dataset.path;
                var line = dr.dataset.line !== '' ? parseInt(dr.dataset.line, 10) : undefined;
                var col = dr.dataset.col ? parseInt(dr.dataset.col, 10) : 0;
                postOpenFile(path, line, col);
              } else {
                details.classList.toggle('collapsed');
                updateCollapseCount();
              }
            }
          }
        });
      });

      document.querySelectorAll('.detail-row').forEach(function(row) {
        row.addEventListener('click', function(e) {
          e.stopPropagation();
          var path = row.dataset.path;
          var line = row.dataset.line !== '' ? parseInt(row.dataset.line, 10) : undefined;
          var col = row.dataset.col ? parseInt(row.dataset.col, 10) : 0;
          postOpenFile(path, line, col);
        });
      });

      updateCollapseCount();
    }

    function updateCollapseCount() {
      var expandedFolders = document.querySelectorAll('.children:not(.collapsed)').length;
      var expandedDetails = document.querySelectorAll('.file-details:not(.collapsed)').length;
      var total = expandedFolders + expandedDetails;
      var btn = document.getElementById('collapseAll');
      btn.textContent = total > 0 ? 'Collapse All (' + total + ')' : 'Collapse All';
    }

    function setAllFolders(expand) {
      document.querySelectorAll('.tree-node[data-type="folder"]').forEach(function(node) {
        var children = node.querySelector(':scope > .children');
        var toggle = node.querySelector('.toggle');
        if (children) {
          if (expand) {
            children.classList.remove('collapsed');
            if (toggle) toggle.textContent = '\\u25BC';
          } else {
            children.classList.add('collapsed');
            if (toggle) toggle.textContent = '\\u25B6';
          }
        }
      });
      document.querySelectorAll('.file-details').forEach(function(details) {
        if (expand) {
          details.classList.remove('collapsed');
        } else {
          details.classList.add('collapsed');
        }
      });
      updateCollapseCount();
    }

    function collectFailures(node) {
      var results = [];
      if (node.type === 'file' && node.entries) {
        var failures = node.entries.filter(function(e) { return e.kind === 'failure'; });
        if (failures.length > 0) {
          results.push({ path: node.path, entries: failures });
        }
      }
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
          results = results.concat(collectFailures(node.children[i]));
        }
      }
      return results;
    }

    function generateFailuresMarkdown() {
      var failures = collectFailures(reportData.root);
      if (failures.length === 0) return '# React Compiler Report\\n\\nNo failures found.';

      var lines = ['# React Compiler Report - Failures', ''];
      lines.push('## Instructions');
      lines.push('');
      lines.push('The following components failed to be optimized by the React Compiler. Fix each function one by one so the compiler can successfully memoize them.');
      lines.push('');
      lines.push('**Rules:**');
      lines.push('- Do not change the underlying logic or behavior of any component.');
      lines.push('- Preserve the existing API (props, return values, side effects).');
      lines.push('- If a fix requires restructuring, extract helper functions rather than rewriting the component.');
      lines.push('- If a failure reason is ambiguous or the fix is unclear, ask for clarification before making changes.');
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('> Generated: ' + new Date(reportData.generatedAt).toLocaleString());
      lines.push('> Total failed components: ' + reportData.totals.failedCount);
      lines.push('');

      for (var i = 0; i < failures.length; i++) {
        var file = failures[i];
        lines.push('## ' + file.path);
        lines.push('');
        // Derive a component name from the file path
        var segments = file.path.replace(/\\\\/g, '/').split('/');
        var baseName = segments[segments.length - 1].replace(/\\.[^.]+$/, '');
        if (baseName === 'index' && segments.length > 1) baseName = segments[segments.length - 2];

        for (var j = 0; j < file.entries.length; j++) {
          var e = file.entries[j];
          var name = e.fnName || baseName;
          var loc = e.line != null ? ' (line ' + e.line + ')' : '';
          var msg = e.description || e.reason;
          lines.push('- **' + name + '**' + loc + ': ' + msg);
        }
        lines.push('');
      }

      return lines.join('\\n');
    }

    // Event listeners
    document.getElementById('expandAll').addEventListener('click', function() { setAllFolders(true); });
    document.getElementById('collapseAll').addEventListener('click', function() { setAllFolders(false); });

    document.getElementById('fixWithAI').addEventListener('click', function() {
      var markdown = generateFailuresMarkdown();
      ideBridge.postMessage({ type: 'fixWithAI', markdown: markdown });
    });

    document.getElementById('statusFilter').addEventListener('change', function(e) {
      filterState.statusFilter = e.target.value;
      saveFilterState();
      renderTree();
    });

    document.getElementById('errorTypeFilter').addEventListener('change', function(e) {
      filterState.errorTypeFilter = e.target.value;
      saveFilterState();
      renderTree();
    });

    var searchTimeout;
    document.getElementById('searchInput').addEventListener('input', function(e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        filterState.searchQuery = e.target.value;
        saveFilterState();
        renderTree();
      }, 200);
    });

    // Restore filter UI state
    document.getElementById('statusFilter').value = filterState.statusFilter;
    document.getElementById('searchInput').value = filterState.searchQuery;

    // Initial render
    renderSummary();
    populateErrorTypeFilter();
    renderTree();
    renderErrors();
  </script>
</body>
</html>`;
}
