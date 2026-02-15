import type { ReportTreeData, EmojiConfig } from "./types";

export function getWebviewHtml(data: ReportTreeData, nonce: string, cspSource: string, emojis: EmojiConfig): string {
  const dataJson = JSON.stringify(data);
  const emojisJson = JSON.stringify(emojis);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <title>React Compiler Report</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }

    .header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
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

    .toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .toolbar select,
    .toolbar input {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 4px 8px;
      border-radius: 2px;
      font-size: var(--vscode-font-size);
      font-family: var(--vscode-font-family);
    }
    .toolbar input {
      flex: 1;
      min-width: 150px;
    }
    .toolbar input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }
    .toolbar button {
      background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
      color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
      border: none;
      padding: 4px 10px;
      border-radius: 2px;
      cursor: pointer;
      font-size: var(--vscode-font-size);
      font-family: var(--vscode-font-family);
    }
    .toolbar button:hover {
      background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-hoverBackground));
    }

    .tree {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
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
      background: var(--vscode-list-hoverBackground);
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
      color: var(--vscode-foreground);
    }
    .file-name:hover {
      text-decoration: underline;
    }
    .folder-name {
      color: var(--vscode-foreground);
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
      background: var(--vscode-list-hoverBackground);
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
    .success-text { color: var(--vscode-testing-iconPassed, #4caf50); }
    .failed-text { color: var(--vscode-testing-iconFailed, #f44336); }

    .errors-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
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
      background: var(--vscode-list-hoverBackground);
    }
    .error-path {
      font-weight: 500;
    }
    .error-message {
      opacity: 0.7;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>React Compiler Report</h1>
    <div class="summary" id="summary"></div>
    <div class="generated-at" id="generatedAt"></div>
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

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const reportData = ${dataJson};
    const emojis = ${emojisJson};

    // Restore filter state
    const savedState = vscode.getState() || {};
    const filterState = {
      statusFilter: savedState.statusFilter || 'all',
      searchQuery: savedState.searchQuery || '',
      errorTypeFilter: savedState.errorTypeFilter || '',
    };

    function saveFilterState() {
      vscode.setState(filterState);
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
      vscode.postMessage({ type: 'openFile', path: filePath, line: line, column: column });
    }

    function renderSummary() {
      const t = reportData.totals;
      document.getElementById('summary').innerHTML =
        '<div class="stat"><span class="stat-value">' + t.filesScanned + '</span><span class="stat-label">scanned</span></div>' +
        '<div class="stat"><span class="stat-value success-text">' + t.successCount + ' ' + emojis.success + '</span><span class="stat-label">compiled</span></div>' +
        '<div class="stat"><span class="stat-value failed-text">' + t.failedCount + ' ' + emojis.error + '</span><span class="stat-label">failed</span></div>' +
        '<div class="stat"><span class="stat-value">' + t.filesWithResults + '</span><span class="stat-label">files with results</span></div>';
      document.getElementById('generatedAt').textContent = 'Generated: ' + new Date(reportData.generatedAt).toLocaleString();
    }

    function collectErrorTypes(node) {
      const types = new Set();
      function walk(n) {
        if (n.failed) {
          for (const f of n.failed) {
            const reason = f.detail && f.detail.options && f.detail.options.reason;
            if (reason) types.add(reason);
          }
        }
        if (n.children) {
          for (const c of n.children) walk(c);
        }
      }
      walk(node);
      return Array.from(types).sort();
    }

    function populateErrorTypeFilter() {
      const select = document.getElementById('errorTypeFilter');
      const types = collectErrorTypes(reportData.root);
      for (const t of types) {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
      }
      select.value = filterState.errorTypeFilter;
    }

    function matchesFilter(node) {
      const sf = filterState.statusFilter;
      const sq = filterState.searchQuery.toLowerCase();
      const ef = filterState.errorTypeFilter;

      if (node.type === 'file') {
        if (sf === 'compiled' && node.successCount === 0) return false;
        if (sf === 'failed' && node.failedCount === 0) return false;
        if (sq && !node.path.toLowerCase().includes(sq)) return false;
        if (ef) {
          const hasMatchingError = node.failed && node.failed.some(function(f) {
            return f.detail && f.detail.options && f.detail.options.reason === ef;
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
      if (!node.success && !node.failed) return '';
      const items = [];
      if (node.success) {
        for (const s of node.success) {
          const name = s.fnName || 'anonymous';
          const line = s.fnLoc && s.fnLoc.start ? s.fnLoc.start.line : undefined;
          const col = s.fnLoc && s.fnLoc.start ? s.fnLoc.start.column : 0;
          const locText = line !== undefined ? ':' + line : '';
          items.push(
            '<div class="detail-row" data-path="' + escapeAttr(node.path) + '" data-line="' + (line !== undefined ? line - 1 : '') + '" data-col="' + col + '">' +
            '<span class="detail-icon">' + emojis.success + '</span>' +
            '<span class="detail-name success-text">' + escapeHtml(name) + '</span>' +
            '<span class="detail-loc">' + escapeHtml(locText) + '</span>' +
            '</div>'
          );
        }
      }
      if (node.failed) {
        for (const f of node.failed) {
          const name = f.fnName || 'anonymous';
          const reason = (f.detail && f.detail.options && f.detail.options.reason) || (f.kind || '');
          const line = f.fnLoc && f.fnLoc.start ? f.fnLoc.start.line : undefined;
          const col = f.fnLoc && f.fnLoc.start ? f.fnLoc.start.column : 0;
          const locText = line !== undefined ? ':' + line : '';

          if (filterState.errorTypeFilter && reason !== filterState.errorTypeFilter) continue;

          items.push(
            '<div class="detail-row" data-path="' + escapeAttr(node.path) + '" data-line="' + (line !== undefined ? line - 1 : '') + '" data-col="' + col + '">' +
            '<span class="detail-icon">' + emojis.error + '</span>' +
            '<span class="detail-name failed-text">' + escapeHtml(name) + '</span>' +
            '<span class="detail-reason">' + escapeHtml(reason) + '</span>' +
            '<span class="detail-loc">' + escapeHtml(locText) + '</span>' +
            '</div>'
          );
        }
      }
      if (items.length === 0) return '';
      return '<div class="file-details collapsed">' + items.join('') + '</div>';
    }

    function renderNode(node, depth) {
      if (!hasVisibleDescendant(node) && node.type === 'folder') return '';
      if (node.type === 'file' && !matchesFilter(node)) return '';

      const isFolder = node.type === 'folder';
      const toggleIcon = isFolder ? '\\u25B6' : '';
      const nodeIcon = isFolder ? '\\uD83D\\uDCC1' : '\\uD83D\\uDCC4';
      const nameClass = isFolder ? 'folder-name' : 'file-name';

      let html = '<div class="tree-node" data-type="' + node.type + '">';
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
        for (const child of node.children) {
          html += renderNode(child, depth + 1);
        }
        html += '</div>';
      } else if (!isFolder) {
        html += renderFileDetails(node, depth);
      }

      html += '</div>';
      return html;
    }

    function renderTree() {
      const treeEl = document.getElementById('tree');
      let html = '';
      if (reportData.root.children) {
        for (const child of reportData.root.children) {
          html += renderNode(child, 0);
        }
      }
      treeEl.innerHTML = html || '<div style="opacity:0.6;padding:8px;">No matching files found.</div>';
      attachTreeListeners();
    }

    function renderErrors() {
      const section = document.getElementById('errorsSection');
      if (!reportData.errors || reportData.errors.length === 0) {
        section.style.display = 'none';
        return;
      }
      let html = '<h2>Errors (' + reportData.errors.length + ')</h2>';
      for (const err of reportData.errors) {
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
          const treeNode = row.parentElement;
          const type = treeNode.dataset.type;

          if (type === 'folder') {
            const children = treeNode.querySelector(':scope > .children');
            const toggle = row.querySelector('.toggle');
            if (children) {
              const isCollapsed = children.classList.toggle('collapsed');
              toggle.textContent = isCollapsed ? '\\u25B6' : '\\u25BC';
            }
            updateCollapseCount();
          } else {
            const details = treeNode.querySelector(':scope > .file-details');
            if (details) {
              const detailRows = details.querySelectorAll('.detail-row');
              if (detailRows.length === 1) {
                const dr = detailRows[0];
                const path = dr.dataset.path;
                const line = dr.dataset.line !== '' ? parseInt(dr.dataset.line, 10) : undefined;
                const col = dr.dataset.col ? parseInt(dr.dataset.col, 10) : 0;
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
          const path = row.dataset.path;
          const line = row.dataset.line !== '' ? parseInt(row.dataset.line, 10) : undefined;
          const col = row.dataset.col ? parseInt(row.dataset.col, 10) : 0;
          postOpenFile(path, line, col);
        });
      });

      updateCollapseCount();
    }

    function updateCollapseCount() {
      const expandedFolders = document.querySelectorAll('.children:not(.collapsed)').length;
      const expandedDetails = document.querySelectorAll('.file-details:not(.collapsed)').length;
      const total = expandedFolders + expandedDetails;
      const btn = document.getElementById('collapseAll');
      btn.textContent = total > 0 ? 'Collapse All (' + total + ')' : 'Collapse All';
    }

    function setAllFolders(expand) {
      document.querySelectorAll('.tree-node[data-type="folder"]').forEach(function(node) {
        const children = node.querySelector(':scope > .children');
        const toggle = node.querySelector('.toggle');
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

    // Event listeners
    document.getElementById('expandAll').addEventListener('click', function() { setAllFolders(true); });
    document.getElementById('collapseAll').addEventListener('click', function() { setAllFolders(false); });

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

    let searchTimeout;
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
