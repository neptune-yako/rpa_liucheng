#!/usr/bin/env node
/**
 * 流程易 (FlowEasy) 通用 CLI 驱动
 *
 * 流程易是一个 Electron 桌面 RPA 平台，启动后在 127.0.0.1:5555 暴露 REST API。
 * 本驱动提供对该 API 的完整命令行访问。
 *
 * 用法:
 *   node driver.mjs <command> [options]
 *
 * 查询类:
 *   list-projects                          列出所有项目
 *   list-flows     --project <name|id>      列出项目的流程
 *   show-flow      --flow-id <id>           查看流程详情（节点、变量、参数）
 *   show-node      --node-id <id> --flow-id <id>  查看节点详情
 *   search         --flow-id <id> --keyword <kw>  在流程中搜索关键词
 *   search-all     --project <name> --keyword <kw> 跨所有流程搜索
 *
 * 操作类:
 *   edit-node      --node-id <id> --flow-id <id> --param-id <id> --value <v>
 *                  [--display <d>] [--name <n>] [--value-type <t>]
 *   edit-global    --flow-id <id> --var-id <id> --value <v>
 *                  [--name <n>] [--value-type <t>]
 *   translate      --flow-id <id> [--trans-type <t>] [--run-type <t>]
 *   code-to-card   --flow-id <id> --line <n>
 *
 * 全局变量:
 *   query-global   --flow-id <id>           查询全局变量列表
 *   add-global     --flow-id <id> --name <n> [--value <v>] [--value-type <t>] [--desc <d>] [--encrypt <0|1>]
 *   del-global     --flow-id <id> --var-id <id>
 *
 * 流程参数:
 *   query-params   --flow-id <id>
 *   add-param      --flow-id <id> --name <n> [--default <v>] [--value-type <t>] [--param-type <0|1>] [--desc <d>]
 *   update-param   --flow-id <id> --param-id <id> --name <n> [--value-type <t>] [--param-type <0|1>]
 *   del-param      --flow-id <id> --param-id <id>
 *
 * 描述/重命名:
 *   edit-flow-desc --flow-id <id> --desc <描述>
 *   edit-node-desc --flow-id <id> --node-id <id> --desc <描述>
 *   rename-flow    --flow-id <id> --name <新名称>
 *
 * 安全编辑（复制→禁用原节点→在新节点修改→验证后提交或回滚）:
 *   edit-session-start  --flow-id <id> --node-id <id> [--session-id <id>]
 *   edit-session-commit --session-id <id>
 *   edit-session-rollback --session-id <id>
 *   edit-session-list
 *   edit-session-clean --session-id <id>
 *
 * 批量类:
 *   scan           --project <name> [--keyword <kw>]
 *   replace        --project <name> --from <old> --to <new> [--no-dry-run]
 *
 * 便捷命令:
 *   replace-module --flow-id <id> --old-node-id <id> --new-module-id <id>
 *                  一键替换组件类型（add→复制参数→复制customAttr→delete）
 *
 * 底层:
 *   raw            --method <GET|POST> --path <path> [--body '<json>']
 *
 * 环境变量:
 *   FLOWEASY_API   流程易 API 地址 (默认: http://127.0.0.1:5555)
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.FLOWEASY_API || 'http://127.0.0.1:5555';
const SESSION_FILE = join(__dirname, 'edit-sessions.json');

// ============================================================
// HTTP helpers
// ============================================================

async function api(method, path, body = null) {
  // Normalize path: ensure it starts with /
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const url = `${BASE}${normalizedPath}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
    },
  };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(url, opts);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status} from ${method} ${path}: ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  if (json.code !== 0) {
    throw new Error(`API error ${method} ${path}: code=${json.code} msg=${json.message}`);
  }
  return json.data;
}

const apiGet = (path) => api('GET', path);
const apiPost = (path, body) => api('POST', path, body);

// ============================================================
// API wrappers — every endpoint from interfaces.txt
// ============================================================

const FlowEasy = {
  queryProjects:       ()           => apiGet('/projectManagement/query_project/'),
  queryFlowList:       (projectId)  => apiPost('/flowList/queryflowlist/', { projectId, type: 'flat' }),
  queryWorkflow:       (flowId)     => apiPost('/workFlow/queryworkflow/', { flowId }),
  queryNode:           (nodeId, flowId) => apiPost('/flowNode/querynode/', { nodeId, flowId }),
  searchByKeyword:     (flowId, keyWord) => apiPost('/workFlow/queryByKeyword/', { flowId, keyWord }),
  editNodeParam:       (params)     => apiPost('/nodeParam/editnodeparam/', params),
  updateGlobalVar:     (params)     => apiPost('/globalList/update/', {
    valueType: params.valueType || 'string',
    globalVariable_id: params.globalVariable_id,
    name: params.name,
    desc: params.desc || '',
    defaultValue: params.defaultValue,
    flowId: params.flowId,
    isEncrypt: params.isEncrypt || 0,
  }),
  translate:           (flowId, transType = 'text', runType = 'switch_flow') =>
    apiPost('/softwarecontroll/sw/translate', { flowId, transType, runType }),
  codeToCard:          (flowId, line) =>
    apiPost('/softwarecontroll/code_to_card', { flowId, line }),

  // === 组件/流程节点管理（新增组件.txt） ===
  selectModuleDefs:     () =>
    apiPost('/module/selectModuleDefs/', { moduleIds: [] }),
  selectModuleDef:      (moduleId) =>
    apiPost('/module/selectModuleDef/', { moduleId }),
  addNode:              (flowId, moduleId, prefixNodeId, type = 'add') =>
    apiPost('/flowNode/addnode/', { flowId, moduleId, prefixNodeId, type }),
  delNode:              (flowId, nodeIdList) =>
    apiPost('/flowNode/delNode/', { nodeIdList, flowId }),
  editNodeStatus:       (flowId, nodeIdList, isEnable) =>
    apiPost('/flowNode/editnodestatus/', { nodeIdList, isEnable, flowId }),
  editCustomAttr:       (flowId, nodeId, customAttr) =>
    apiPost('/flowNode/editcustomAttr/', { flowId, nodeId, customAttr }),
  addPara:              (flowId, parameterName, defaultValue, valueType, type, desc = '') =>
    apiPost('/paralist/add_para/', { flowId, parameterName, defaultValue, valueType, type, desc }),
  updatePara:           (flowId, parameterId, parameterName, valueType, type, desc = '') =>
    apiPost('/paralist/update_para/', { type, valueType, desc, parameterName, parameterId, flowId }),
  delPara:              (flowId, parameterId) =>
    apiPost('/paralist/del_para/', { flowId, parameterId }),
  queryPara:            (flowId) =>
    apiPost('/paralist/query_para/', { flowId }),

  // === 全局变量管理 ===
  queryGlobalVar:       (flowId) =>
    apiPost('/globalList/query/', { flowId }),
  insertGlobalVar:      (flowId, name, defaultValue, valueType, desc, isEncrypt) =>
    apiPost('/globalList/insert/', { flowId, name, defaultValue: defaultValue || '', valueType: valueType || 'string', desc: desc || '', isEncrypt: isEncrypt || 0 }),
  deleteGlobalVar:      (flowId, globalVariable_id) =>
    apiPost('/globalList/delete/', { flowId, globalVariable_id }),

  // === 流程管理 ===
  editFlowDesc:         (flowId, flowDesc) =>
    apiPost('/workFlow/editFlowDesc', { flowId, flowDesc }),
  editNodeDesc:         (flowId, nodeId, desc) =>
    apiPost('/flowNode/editnodedesc/', { flowId, nodeId, desc }),
  renameFlow:           (flowId, name) =>
    apiPost('/flowList/renameflow/', { flowId, name }),
};

// ============================================================
// Session management — 安全编辑（复制→禁用→修改→验证→提交/回滚）
// ============================================================

function loadSessions() {
  try {
    if (existsSync(SESSION_FILE)) {
      const raw = readFileSync(SESSION_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`⚠ 读取 edit-sessions.json 失败: ${e.message}`);
  }
  return { sessions: {} };
}

function saveSessions(data) {
  writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateSessionId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'es_';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * 36)];
  }
  return id;
}

// ============================================================
// Utility: find project by name (fuzzy match)
// ============================================================

async function resolveProject(nameOrId) {
  const projects = await FlowEasy.queryProjects();
  // Exact ID match first
  const byId = projects.find(p => p.project_id === nameOrId);
  if (byId) return byId;
  // Fuzzy name match
  const byName = projects.find(p => p.name.includes(nameOrId));
  if (byName) return byName;
  return null;
}

// ============================================================
// Deep block walker (for scanning flow structure)
// ============================================================

const CHILD_KEYS = [
  'tryChildren', 'catchChildren', 'finallyChildren',
  'loopChildren', 'ifChildren', 'elseChildren', 'elseLoopChildren',
  'Lcplay'
];

function* walkBlocks(blocks, parentPath = '') {
  for (const block of blocks) {
    const path = parentPath ? `${parentPath} > ${block.name}` : block.name;
    yield { block, path };
    for (const key of CHILD_KEYS) {
      if (Array.isArray(block[key]) && block[key].length > 0) {
        yield* walkBlocks(block[key], path);
      }
    }
  }
}

// ============================================================
// URL / pattern finder
// ============================================================

const URL_RE = /https?:\/\/[^\s"'<>]+/gi;
const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/\S*)?\b/g;

function findPatterns(text, patterns = [URL_RE, IP_RE]) {
  if (!text || typeof text !== 'string') return [];
  const seen = new Set();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      seen.add(m[0]);
    }
  }
  return [...seen];
}

// ============================================================
// show-flow — print a flow's full detail in readable form
// ============================================================

async function showFlow(flowId) {
  const data = await FlowEasy.queryWorkflow(flowId);
  if (!data) return;

  console.log(`流程: ${data.name || '(未命名)'}  (${data._id})`);
  console.log(`类型: ${data.viewType}, 描述: ${data.desc || '(无)'}`);

  // Global variables
  const gv = data.globalVarList || [];
  if (gv.length > 0) {
    console.log(`\n全局变量 (${gv.length}):`);
    for (const v of gv) {
      console.log(`  ${v.name}: ${v.defaultValue || '(空)'}  [${v.valueType}]  _id=${v._id}`);
    }
  } else {
    console.log(`\n全局变量: (无)`);
  }

  // Blocks (nodes)
  const blocks = data.blocks || [];
  console.log(`\n节点 (${blocks.length}):`);
  for (const b of blocks) {
    printBlock(b, 0);
  }

  // Parameters
  const params = data.parameters || [];
  if (params.length > 0) {
    console.log(`\n流程参数 (${params.length}):`);
    for (const p of params) {
      console.log(`  ${p.parameterName}: ${p.defaultValue} [${p.valueType}]`);
    }
  }
}

function printBlock(block, depth) {
  const indent = '  '.repeat(depth + 1);
  console.log(`${indent}[${block.codeName || block.moduleid}] ${block.name}`);
  if (block.desc) console.log(`${indent}  描述: ${block.desc}`);

  const inputs = block.inputs || [];
  for (const inp of inputs) {
    const val = typeof inp.value === 'object' ? JSON.stringify(inp.value) : String(inp.value);
    console.log(`${indent}  入参 ${inp.display || inp.name}: ${val}  [${inp.valueType}]  _id=${inp._id}`);
  }
  const outputs = block.outputs || [];
  for (const out of outputs) {
    console.log(`${indent}  出参 ${out.display || out.name}: ${out.value}  [${out.valueType}]  _id=${out._id}`);
  }

  for (const key of CHILD_KEYS) {
    if (Array.isArray(block[key])) {
      for (const child of block[key]) {
        printBlock(child, depth + 1);
      }
    }
  }
}

// ============================================================
// scan — discover patterns across all flows in a project
// ============================================================

async function cmdScan(opts) {
  const project = await resolveProject(opts.project || '');
  if (!project) {
    console.log('未找到项目。可用项目:');
    const projects = await FlowEasy.queryProjects();
    for (const p of projects) console.log(`  - ${p.name} (${p.project_id})`);
    return;
  }

  console.log(`项目: ${project.name} (${project.project_id})`);

  const flows = await FlowEasy.queryFlowList(project.project_id);
  const topFlows = flows.filter(f => f.type === '1');
  console.log(`主流程: ${topFlows.length}, 总流程/子流程: ${flows.length}\n`);

  const flowNames = new Map();
  for (const f of flows) flowNames.set(f.key, f.title);

  const allFindings = [];
  const keyword = opts.keyword || '';

  for (const flow of flows) {
    try {
      const data = await FlowEasy.queryWorkflow(flow.key);
      if (!data) continue;
      const name = data.name || flow.title;
      flowNames.set(flow.key, name);

      // Global variables
      for (const gv of (data.globalVarList || [])) {
        const patterns = keyword
          ? (String(gv.defaultValue || '').includes(keyword) || gv.name.includes(keyword) ? [keyword] : [])
          : findPatterns(gv.defaultValue || '');
        if (patterns.length > 0 || (keyword && (String(gv.defaultValue || '').includes(keyword) || gv.name.includes(keyword)))) {
          allFindings.push({
            type: '全局变量',
            flowId: flow.key,
            flowName: name,
            display: `全局变量: ${gv.name}`,
            currentValue: gv.defaultValue,
            valueType: gv.valueType,
            desc: gv.desc || '',
            isEncrypt: gv.isEncrypt || 0,
            patterns: keyword ? [keyword] : findPatterns(gv.defaultValue || ''),
            paramId: gv._id,
            path: `全局变量 > ${gv.name}`,
          });
        }
      }

      // Block inputs/outputs
      for (const { block, path } of walkBlocks(data.blocks || [])) {
        for (const inp of (block.inputs || [])) {
          const val = String(inp.value || '');
          const patterns = keyword
            ? (val.includes(keyword) ? [keyword] : [])
            : findPatterns(val);
          if (patterns.length > 0) {
            allFindings.push({
              type: '组件输入',
              flowId: flow.key,
              flowName: name,
              display: `${block.name} > ${inp.display || inp.name}`,
              currentValue: val,
              patterns,
              paramId: inp._id,
              nodeId: block._id,
              path,
              valueType: inp.valueType || 'string',
              paramName: inp.name || inp.display || '',
              paramDisplay: inp.display || inp.name || '',
            });
          }
        }
        for (const out of (block.outputs || [])) {
          const val = String(out.value || '');
          const patterns = keyword
            ? (val.includes(keyword) ? [keyword] : [])
            : findPatterns(val);
          if (patterns.length > 0) {
            allFindings.push({
              type: '组件输出',
              flowId: flow.key,
              flowName: name,
              display: `${block.name} > ${out.display || out.name}`,
              currentValue: val,
              patterns,
              paramId: out._id,
              nodeId: block._id,
              path,
              valueType: out.valueType || 'string',
              paramName: out.name || out.display || '',
              paramDisplay: out.display || out.name || '',
            });
          }
        }
      }
    } catch (e) {
      // Skip flows that fail to load
    }
  }

  // Deduplicate global variables by _id (sub-flows share parent's vars)
  const globalVarMap = new Map();
  const otherFindings = [];
  for (const f of allFindings) {
    if (f.type === '全局变量') {
      if (globalVarMap.has(f.paramId)) {
        globalVarMap.get(f.paramId).refFlows.push({ flowId: f.flowId, flowName: f.flowName });
      } else {
        f.refFlows = [{ flowId: f.flowId, flowName: f.flowName }];
        globalVarMap.set(f.paramId, f);
      }
    } else {
      otherFindings.push(f);
    }
  }

  const uniqueGlobals = [...globalVarMap.values()];

  // Print
  console.log('='.repeat(60));
  console.log(`扫描结果: ${uniqueGlobals.length} 个唯一全局变量 + ${otherFindings.length} 个组件参数`);
  console.log('='.repeat(60));

  for (const gv of uniqueGlobals) {
    console.log(`\n[全局变量] ${gv.display}`);
    console.log(`  值: ${gv.currentValue}`);
    console.log(`  varId: ${gv.paramId}  flowId: ${gv.flowId}`);
    if (gv.refFlows.length > 1) {
      console.log(`  引用: ${gv.refFlows.map(r => r.flowName).join(', ')}`);
    }
  }

  // Group other findings by flow
  const byFlow = new Map();
  for (const f of otherFindings) {
    const name = f.flowName || flowNames.get(f.flowId) || f.flowId;
    if (!byFlow.has(name)) byFlow.set(name, []);
    byFlow.get(name).push(f);
  }
  for (const [flowName, items] of byFlow) {
    console.log(`\n--- ${flowName} ---`);
    for (const item of items) {
      console.log(`  [${item.type}] ${item.display}`);
      console.log(`    值: ${item.currentValue.slice(0, 120)}`);
      if (item.patterns.length > 0) console.log(`    匹配: ${item.patterns.join(', ')}`);
      console.log(`    paramId: ${item.paramId}  nodeId: ${item.nodeId || 'N/A'}  flowId: ${item.flowId}`);
    }
  }

  return { project, uniqueGlobals, otherFindings, flowNames };
}

// ============================================================
// replace — batch find-and-replace across a project
// ============================================================

async function cmdReplace(opts) {
  const dryRun = opts.dryRun !== false;

  console.log('='.repeat(60));
  console.log(`${dryRun ? '[DRY RUN] ' : ''}批量替换`);
  console.log(`  ${opts.from}  →  ${opts.to}`);
  console.log('='.repeat(60));

  const scanResult = await cmdScan({ project: opts.project, keyword: opts.from });

  if (!scanResult) return;

  const allFindings = [...scanResult.uniqueGlobals, ...scanResult.otherFindings];
  const targets = allFindings.filter(f =>
    f.currentValue && f.currentValue.includes(opts.from)
  );

  const gvTargets = targets.filter(t => t.type === '全局变量');
  const otherTargets = targets.filter(t => t.type !== '全局变量');

  console.log(`\n匹配: ${gvTargets.length} 个全局变量 + ${otherTargets.length} 个组件参数\n`);

  for (const t of targets) {
    const newValue = t.currentValue.replaceAll(opts.from, opts.to);
    console.log(`  [${t.type}] ${t.display}`);
    console.log(`    ${t.currentValue}  →  ${newValue}`);
    if (t.refFlows && t.refFlows.length > 1) {
      console.log(`    影响流程: ${t.refFlows.map(r => r.flowName).join(', ')}`);
    }

    if (!dryRun) {
      try {
        if (t.type === '全局变量') {
          await FlowEasy.updateGlobalVar({
            globalVariable_id: t.paramId,
            flowId: t.flowId,
            name: t.display.replace('全局变量: ', ''),
            defaultValue: newValue,
            valueType: t.valueType || 'string',
            desc: t.desc || '',
            isEncrypt: t.isEncrypt || 0,
          });
          console.log(`    ✓ 已修改 (globalList/update)`);
        } else {
          const body = {
            _id: t.paramId,
            flowId: t.flowId,
            nodeId: t.nodeId,
            value: newValue,
            valueType: t.valueType || 'string',
          };
          // 只在 scan 结果中有值时才传入 display/name，避免覆盖
          if (t.paramDisplay) body.display = t.paramDisplay;
          if (t.paramName) body.name = t.paramName;
          await FlowEasy.editNodeParam(body);
          console.log(`    ✓ 已修改 (editnodeparam)`);
        }
      } catch (e) {
        console.log(`    ✗ 失败: ${e.message}`);
      }
    }
    console.log('');
  }

  if (dryRun) {
    console.log(`[DRY RUN] 使用 --no-dry-run 执行实际修改`);
    console.log(`将调用 API ${gvTargets.length} 次 (globalList/update) + ${otherTargets.length} 次 (editnodeparam)`);
  } else {
    console.log(`完成: ${gvTargets.length} 个全局变量 + ${otherTargets.length} 个组件参数`);
  }

  return { targets, gvTargets, otherTargets };
}

// ============================================================
// search-all — search keyword across all flows in a project
// ============================================================

async function cmdSearchAll(opts) {
  const project = await resolveProject(opts.project || '');
  if (!project) {
    console.log('未找到项目。');
    return;
  }
  const flows = await FlowEasy.queryFlowList(project.project_id);
  const keyword = opts.keyword;
  if (!keyword) {
    console.log('请指定 --keyword');
    return;
  }

  console.log(`在项目 "${project.name}" 中搜索 "${keyword}"...\n`);

  const found = [];
  for (const flow of flows) {
    try {
      const result = await FlowEasy.searchByKeyword(flow.key, keyword);
      if (Array.isArray(result) && result.length > 0) {
        console.log(`  ${flow.title}: ${result.length} 个匹配节点`);
        for (const nodeId of result) {
          console.log(`    - ${nodeId}`);
        }
        found.push({ flow, nodeIds: result });
      }
    } catch (e) {
      // skip
    }
  }

  if (found.length === 0) {
    console.log('未找到匹配。');
  } else {
    console.log(`\n共 ${found.length} 个流程中有匹配, ${found.reduce((s, f) => s + f.nodeIds.length, 0)} 个节点`);
  }

  return found;
}

// ============================================================
// CLI dispatcher
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  // Parse --key value pairs
  const opts = {};
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key === 'no-dry-run') {
        opts.dryRun = false;
      } else if (key === 'dry-run') {
        opts.dryRun = true;
      } else {
        const val = args[i + 1];
        if (val && !val.startsWith('--')) {
          opts[key] = val;
          i++;
        } else {
          opts[key] = true;
        }
      }
    }
  }

  try {
    switch (cmd) {
      // === Query ===
      case 'list-projects': {
        const projects = await FlowEasy.queryProjects();
        for (const p of projects) {
          console.log(`${p.name}  (${p.project_id})`);
        }
        break;
      }
      case 'list-flows': {
        const project = await resolveProject(opts.project || '');
        if (!project) { console.log('请指定 --project <name|id>'); break; }
        const flows = await FlowEasy.queryFlowList(project.project_id);
        console.log(`项目: ${project.name}\n`);
        for (const f of flows) {
          const marker = f.type === '1' ? '★' : '  ├─';
          console.log(`${marker} ${f.title}  (${f.key})`);
        }
        break;
      }
      case 'show-flow': {
        if (!opts['flow-id']) { console.log('请指定 --flow-id <id>'); break; }
        await showFlow(opts['flow-id']);
        break;
      }
      case 'show-node': {
        if (!opts['flow-id'] || !opts['node-id']) { console.log('请指定 --flow-id 和 --node-id'); break; }
        const node = await FlowEasy.queryNode(opts['node-id'], opts['flow-id']);
        console.log(JSON.stringify(node, null, 2));
        break;
      }
      case 'search': {
        if (!opts['flow-id'] || !opts.keyword) { console.log('请指定 --flow-id 和 --keyword'); break; }
        const result = await FlowEasy.searchByKeyword(opts['flow-id'], opts.keyword);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'search-all': {
        await cmdSearchAll(opts);
        break;
      }

      // === Mutate ===
      case 'edit-node': {
        if (!opts['flow-id'] || !opts['node-id'] || !opts['param-id'] || opts.value === undefined) {
          console.log('用法: edit-node --flow-id <id> --node-id <id> --param-id <id> --value <v> [--display <d>] [--name <n>] [--value-type <t>]');
          break;
        }
        if (!opts['value-type']) {
          console.warn('⚠ 未指定 --value-type，默认使用 string。如果是 python 类型参数请显式指定 --value-type python');
        }
        const editBody = {
          _id: opts['param-id'],
          flowId: opts['flow-id'],
          nodeId: opts['node-id'],
          value: opts.value,
          valueType: opts['value-type'] || 'string',
        };
        // 只有用户显式传入时才设置 display/name，避免覆盖原始值
        if (opts.display !== undefined) editBody.display = opts.display;
        if (opts.name !== undefined) editBody.name = opts.name;
        const result = await FlowEasy.editNodeParam(editBody);
        console.log('✓ 已修改', JSON.stringify(result));
        break;
      }
      case 'edit-global': {
        if (!opts['flow-id'] || !opts['var-id'] || opts.value === undefined) {
          console.log('用法: edit-global --flow-id <id> --var-id <id> --value <v> [--name <n>] [--value-type <t>]');
          break;
        }
        const result = await FlowEasy.updateGlobalVar({
          globalVariable_id: opts['var-id'],
          flowId: opts['flow-id'],
          name: opts.name || '',
          defaultValue: opts.value,
          valueType: opts['value-type'] || 'string',
          desc: '',
          isEncrypt: 0,
        });
        console.log('✓ 已修改', JSON.stringify(result));
        break;
      }
      case 'translate': {
        if (!opts['flow-id']) { console.log('请指定 --flow-id'); break; }
        const result = await FlowEasy.translate(
          opts['flow-id'],
          opts['trans-type'] || 'text',
          opts['run-type'] || 'switch_flow'
        );
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'code-to-card': {
        if (!opts['flow-id'] || !opts.line) { console.log('请指定 --flow-id 和 --line'); break; }
        const result = await FlowEasy.codeToCard(opts['flow-id'], Number(opts.line));
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      // === 组件/流程节点管理 ===
      case 'list-modules': {
        const modules = await FlowEasy.selectModuleDefs();
        if (Array.isArray(modules)) {
          console.log(`共 ${modules.length} 个组件:\n`);
          for (const m of modules) {
            console.log(`${m.name || '(未命名)'}  (${m.moduleId || m.moduleid})`);
            if (m.desc) console.log(`  描述: ${m.desc}`);
          }
        } else {
          console.log(JSON.stringify(modules, null, 2));
        }
        break;
      }
      case 'show-module': {
        if (!opts['module-id']) { console.log('请指定 --module-id <id>'); break; }
        const def = await FlowEasy.selectModuleDef(opts['module-id']);
        console.log(JSON.stringify(def, null, 2));
        break;
      }
      case 'add-node': {
        if (!opts['flow-id'] || !opts['module-id']) {
          console.log('用法: add-node --flow-id <id> --module-id <id> --prefix-node-id <id> [--type <add|after>]');
          break;
        }
        const prefixNodeId = opts['prefix-node-id'] || '';
        const type = opts.type || 'add';
        const result = await FlowEasy.addNode(opts['flow-id'], opts['module-id'], prefixNodeId, type);
        console.log('✓ 已添加节点', JSON.stringify(result));
        break;
      }
      case 'del-node': {
        if (!opts['flow-id'] || !opts['node-ids']) {
          console.log('用法: del-node --flow-id <id> --node-ids <id1,id2,...>');
          break;
        }
        const nodeIdList = opts['node-ids'].split(',').map(s => s.trim());
        const result = await FlowEasy.delNode(opts['flow-id'], nodeIdList);
        console.log('✓ 已删除节点', JSON.stringify(result));
        break;
      }
      case 'toggle-node': {
        if (!opts['flow-id'] || !opts['node-ids']) {
          console.log('用法: toggle-node --flow-id <id> --node-ids <id1,id2,...> (--enable | --disable)');
          break;
        }
        if (opts.enable === undefined && opts.disable === undefined) {
          console.log('请指定 --enable 或 --disable');
          break;
        }
        const nodeIdList = opts['node-ids'].split(',').map(s => s.trim());
        const isEnable = opts.enable !== undefined ? true : false;
        const result = await FlowEasy.editNodeStatus(opts['flow-id'], nodeIdList, isEnable);
        console.log(`✓ 已${isEnable ? '启用' : '禁用'}节点`, JSON.stringify(result));
        break;
      }
      case 'edit-custom-attr': {
        if (!opts['flow-id'] || !opts['node-id'] || !opts['custom-attr']) {
          console.log('用法: edit-custom-attr --flow-id <id> --node-id <id> --custom-attr \'<json>\'');
          break;
        }
        const customAttr = JSON.parse(opts['custom-attr']);
        const result = await FlowEasy.editCustomAttr(opts['flow-id'], opts['node-id'], customAttr);
        console.log('✓ 已更新 customAttr', JSON.stringify(result));
        break;
      }
      case 'add-param': {
        if (!opts['flow-id'] || !opts.name) {
          console.log('用法: add-param --flow-id <id> --name <name> [--default <val>] [--value-type <type>] [--param-type <0|1>] [--desc <desc>]');
          console.log('  --param-type 0=入参, 1=出参 (默认 0)');
          break;
        }
        const result = await FlowEasy.addPara(
          opts['flow-id'],
          opts.name,
          opts.default || '',
          opts['value-type'] || 'string',
          Number(opts['param-type']) || 0,
          opts.desc || ''
        );
        console.log('✓ 已添加参数', JSON.stringify(result));
        break;
      }
      case 'update-param': {
        if (!opts['flow-id'] || !opts['param-id'] || !opts.name) {
          console.log('用法: update-param --flow-id <id> --param-id <id> --name <name> [--value-type <type>] [--param-type <0|1>] [--desc <desc>]');
          console.log('  --param-type 0=入参, 1=出参');
          break;
        }
        const result = await FlowEasy.updatePara(
          opts['flow-id'],
          opts['param-id'],
          opts.name,
          opts['value-type'] || 'string',
          Number(opts['param-type']) || 0,
          opts.desc || ''
        );
        console.log('✓ 已更新参数', JSON.stringify(result));
        break;
      }
      case 'query-params': {
        if (!opts['flow-id']) { console.log('请指定 --flow-id <id>'); break; }
        const params = await FlowEasy.queryPara(opts['flow-id']);
        if (Array.isArray(params)) {
          console.log(`流程参数 (${params.length}):`);
          for (const p of params) {
            const typeLabel = p.type === 0 ? '入参' : p.type === 1 ? '出参' : `type=${p.type}`;
            console.log(`  [${typeLabel}] ${p.parameterName}: ${p.defaultValue || '(空)'}  [${p.valueType}]  _id=${p.parameterId || p._id}`);
            if (p.desc) console.log(`    描述: ${p.desc}`);
          }
        } else {
          console.log(JSON.stringify(params, null, 2));
        }
        break;
      }

      // === 全局变量管理 ===
      case 'query-global': {
        if (!opts['flow-id']) { console.log('请指定 --flow-id <id>'); break; }
        const vars = await FlowEasy.queryGlobalVar(opts['flow-id']);
        if (Array.isArray(vars)) {
          console.log(`全局变量 (${vars.length}):`);
          for (const v of vars) {
            console.log(`  ${v.name}: ${v.defaultValue || '(空)'}  [${v.valueType || v.ValueType}]  _id=${v._id}  encrypt=${v.isEncrypt || 0}`);
            if (v.desc) console.log(`    描述: ${v.desc}`);
          }
        } else {
          console.log(JSON.stringify(vars, null, 2));
        }
        break;
      }
      case 'add-global': {
        if (!opts['flow-id'] || !opts.name) {
          console.log('用法: add-global --flow-id <id> --name <name> [--value <v>] [--value-type <t>] [--desc <d>] [--encrypt <0|1>]');
          break;
        }
        const result = await FlowEasy.insertGlobalVar(
          opts['flow-id'],
          opts.name,
          opts.value || '',
          opts['value-type'] || 'string',
          opts.desc || '',
          Number(opts.encrypt) || 0,
        );
        console.log('✓ 已添加全局变量', JSON.stringify(result));
        break;
      }
      case 'del-global': {
        if (!opts['flow-id'] || !opts['var-id']) {
          console.log('用法: del-global --flow-id <id> --var-id <id>');
          break;
        }
        const result = await FlowEasy.deleteGlobalVar(opts['flow-id'], opts['var-id']);
        console.log('✓ 已删除全局变量', JSON.stringify(result));
        break;
      }

      // === 流程参数管理（补充） ===
      case 'del-param': {
        if (!opts['flow-id'] || !opts['param-id']) {
          console.log('用法: del-param --flow-id <id> --param-id <id>');
          break;
        }
        const result = await FlowEasy.delPara(opts['flow-id'], opts['param-id']);
        console.log('✓ 已删除参数', JSON.stringify(result));
        break;
      }

      // === 流程/节点描述管理 ===
      case 'edit-flow-desc': {
        if (!opts['flow-id'] || opts.desc === undefined) {
          console.log('用法: edit-flow-desc --flow-id <id> --desc <描述>');
          break;
        }
        const result = await FlowEasy.editFlowDesc(opts['flow-id'], opts.desc);
        console.log('✓ 已修改流程描述', JSON.stringify(result));
        break;
      }
      case 'edit-node-desc': {
        if (!opts['flow-id'] || !opts['node-id'] || opts.desc === undefined) {
          console.log('用法: edit-node-desc --flow-id <id> --node-id <id> --desc <描述>');
          break;
        }
        const result = await FlowEasy.editNodeDesc(opts['flow-id'], opts['node-id'], opts.desc);
        console.log('✓ 已修改节点描述', JSON.stringify(result));
        break;
      }
      case 'rename-flow': {
        if (!opts['flow-id'] || !opts.name) {
          console.log('用法: rename-flow --flow-id <id> --name <新名称>');
          break;
        }
        const result = await FlowEasy.renameFlow(opts['flow-id'], opts.name);
        console.log('✓ 已重命名流程', JSON.stringify(result));
        break;
      }

      // === 便捷命令：一键替换组件类型 ===
      case 'replace-module': {
        if (!opts['flow-id'] || !opts['old-node-id'] || !opts['new-module-id']) {
          console.log('用法: replace-module --flow-id <id> --old-node-id <id> --new-module-id <id>');
          console.log('  一键替换组件类型：在旧节点后插入新组件 → 复制 xpath 参数 → 复制 customAttr → 删除旧节点');
          break;
        }
        const flowId = opts['flow-id'];
        const oldNodeId = opts['old-node-id'];
        const newModuleId = opts['new-module-id'];

        try {
          // Step 1: 查询旧节点信息（params + customAttr）
          console.log(`[1/6] 查询旧节点 ${oldNodeId} ...`);
          const oldNode = await FlowEasy.queryNode(oldNodeId, flowId);
          const oldCustomAttr = oldNode.customAttr || {};
          // 收集旧节点的 xpath/python 类型参数
          const oldParams = [];
          for (const inp of (oldNode.inputs || [])) {
            oldParams.push({ name: inp.name, value: inp.value, valueType: inp.valueType, display: inp.display, _id: inp._id });
          }

          // Step 2: 在旧节点后添加新组件
          console.log(`[2/6] 在旧节点后添加新组件 ${newModuleId} ...`);
          const addResult = await FlowEasy.addNode(flowId, newModuleId, oldNodeId, 'after');
          // addResult 可能返回 { _idList: [...] } 或直接的 node 对象
          const newIdList = addResult && (addResult._idList || (Array.isArray(addResult) ? addResult : [addResult._id]));
          const newNodeId = (Array.isArray(newIdList) && newIdList.length > 0) ? newIdList[0] : (addResult._id || addResult);
          if (!newNodeId) {
            throw new Error('无法获取新节点 ID，返回: ' + JSON.stringify(addResult));
          }
          console.log(`  新节点 ID: ${newNodeId}`);

          // Step 3: 查询新节点参数
          console.log(`[3/6] 查询新节点参数 ...`);
          const newNode = await FlowEasy.queryNode(newNodeId, flowId);

          // Step 4: 复制 xpath/python 参数值
          console.log(`[4/6] 复制参数值 ...`);
          let copiedCount = 0;
          for (const newInp of (newNode.inputs || [])) {
            // 按 name 匹配旧参数
            const oldParam = oldParams.find(p => p.name === newInp.name);
            if (oldParam && oldParam.value !== undefined && String(oldParam.value || '').length > 0) {
              await FlowEasy.editNodeParam({
                _id: newInp._id,
                flowId,
                nodeId: newNodeId,
                value: oldParam.value,
                valueType: oldParam.valueType || newInp.valueType || 'string',
                display: newInp.display || newInp.name || '',
                name: newInp.name || '',
              });
              console.log(`  ✓ 复制参数 ${newInp.name}: ${String(oldParam.value).slice(0, 60)}`);
              copiedCount++;
            }
          }
          if (copiedCount === 0) {
            console.log('  (无匹配参数需要复制)');
          }

          // Step 5: 复制 customAttr
          console.log(`[5/6] 复制 customAttr ...`);
          if (oldCustomAttr && Object.keys(oldCustomAttr).length > 0) {
            await FlowEasy.editCustomAttr(flowId, newNodeId, oldCustomAttr);
            console.log(`  ✓ customAttr 已复制`);
          } else {
            console.log('  (旧节点无 customAttr)');
          }

          // Step 6: 删除旧节点
          console.log(`[6/6] 删除旧节点 ${oldNodeId} ...`);
          await FlowEasy.delNode(flowId, [oldNodeId]);
          console.log(`  ✓ 已删除`);

          console.log(`\n✓ 替换完成: ${oldNodeId} → ${newNodeId} (${newModuleId})`);
          console.log(`  共复制 ${copiedCount} 个参数`);
        } catch (e) {
          console.error(`✗ 替换失败: ${e.message}`);
          console.error('  旧节点未被删除，请手动检查是否产生孤儿节点。');
        }
        break;
      }

      // === 安全编辑会话 ===
      case 'edit-session-start': {
        if (!opts['flow-id'] || !opts['node-id']) {
          console.log('用法: edit-session-start --flow-id <id> --node-id <id> [--session-id <id>]');
          console.log('  安全编辑：复制节点 → 禁用原节点 → 在新节点上修改 → 验证后 commit 或 rollback');
          console.log('  不指定 --session-id 则自动创建新会话，指定则追加到已有会话');
          break;
        }
        const flowId = opts['flow-id'];
        const origNodeId = opts['node-id'];
        const sessionId = opts['session-id'] || generateSessionId();

        try {
          // 1. 查询原节点
          console.log(`[1/5] 查询原节点 ${origNodeId} ...`);
          const origNode = await FlowEasy.queryNode(origNodeId, flowId);
          const moduleId = origNode.moduleId || origNode.moduleid;
          const origDesc = origNode.desc || '';
          const origCustomAttr = origNode.customAttr || {};
          const nodeName = origNode.name || origNode.codeName || '(未知)';
          console.log(`  节点: ${nodeName}  moduleId: ${moduleId}`);

          // 2. 在原节点后复制一个新节点
          console.log(`[2/5] 在原节点后添加副本 ...`);
          const addResult = await FlowEasy.addNode(flowId, moduleId, origNodeId, 'after');
          const newIdList = addResult && (addResult._idList || (Array.isArray(addResult) ? addResult : [addResult._id]));
          const newNodeId = (Array.isArray(newIdList) && newIdList.length > 0) ? newIdList[0] : (addResult._id || addResult);
          if (!newNodeId) {
            throw new Error('无法获取新节点 ID，返回: ' + JSON.stringify(addResult));
          }
          console.log(`  新节点 ID: ${newNodeId}`);

          // 3. 复制所有参数值 + customAttr
          console.log(`[3/5] 复制参数值 + customAttr ...`);
          const newNode = await FlowEasy.queryNode(newNodeId, flowId);
          let copiedCount = 0;
          for (const newInp of (newNode.inputs || [])) {
            const oldInp = (origNode.inputs || []).find(p => p.name === newInp.name);
            if (oldInp && oldInp.value !== undefined && String(oldInp.value || '').length > 0) {
              await FlowEasy.editNodeParam({
                _id: newInp._id,
                flowId,
                nodeId: newNodeId,
                value: oldInp.value,
                valueType: oldInp.valueType || newInp.valueType || 'string',
                display: newInp.display || newInp.name || '',
                name: newInp.name || '',
              });
              copiedCount++;
            }
          }
          // 复制 customAttr
          if (origCustomAttr && Object.keys(origCustomAttr).length > 0) {
            await FlowEasy.editCustomAttr(flowId, newNodeId, origCustomAttr);
            console.log(`  ✓ customAttr 已复制`);
          }
          console.log(`  ✓ 共复制 ${copiedCount} 个参数`);

          // 4. 在新节点 desc 中打上 session 标记
          console.log(`[4/5] 标记会话 ID ...`);
          const sessionMarker = `[编辑中|session:${sessionId}]`;
          const newDesc = origDesc ? `${sessionMarker} ${origDesc}` : sessionMarker;
          await FlowEasy.editNodeDesc(flowId, newNodeId, newDesc);

          // 5. 禁用原节点
          console.log(`[5/5] 禁用原节点 ...`);
          await FlowEasy.editNodeStatus(flowId, [origNodeId], false);
          console.log(`  ✓ 原节点已禁用`);

          // 保存会话
          const data = loadSessions();
          if (!data.sessions[sessionId]) {
            data.sessions[sessionId] = {
              createdAt: new Date().toISOString(),
              flowId,
              flowName: '(待查询)',
              nodes: [],
            };
          }
          data.sessions[sessionId].nodes.push({
            originalNodeId: origNodeId,
            originalDesc: origDesc || '',
            newNodeId,
            nodeName,
            moduleId,
          });
          saveSessions(data);

          console.log(`\n✓ 会话 ${sessionId} 已创建/更新`);
          console.log(`  原节点: ${origNodeId} (已禁用) → 新节点: ${newNodeId} (可编辑)`);
          console.log(`  文件: ${SESSION_FILE}`);
          console.log(`\n后续操作:`);
          console.log(`  修改新节点: 使用 edit-node / edit-node-desc 等命令操作 ${newNodeId}`);
          console.log(`  验证通过:   node driver.mjs edit-session-commit --session-id ${sessionId}`);
          console.log(`  回滚还原:   node driver.mjs edit-session-rollback --session-id ${sessionId}`);
        } catch (e) {
          console.error(`✗ edit-session-start 失败: ${e.message}`);
        }
        break;
      }

      case 'edit-session-commit': {
        if (!opts['session-id']) {
          console.log('用法: edit-session-commit --session-id <id>');
          console.log('  验证通过后提交：删除所有被禁用的原节点，将新节点 desc 还原');
          break;
        }
        const sessionId = opts['session-id'];
        const data = loadSessions();
        const session = data.sessions[sessionId];
        if (!session) {
          console.log(`未找到会话 ${sessionId}`);
          console.log(`可用会话: ${Object.keys(data.sessions).join(', ') || '(无)'}`);
          break;
        }

        console.log(`提交会话 ${sessionId} (${session.nodes.length} 个节点)...\n`);
        let ok = 0, fail = 0;
        for (const n of session.nodes) {
          try {
            // 1. 删除原节点
            console.log(`  删除原节点 ${n.originalNodeId} (${n.nodeName}) ...`);
            await FlowEasy.delNode(session.flowId, [n.originalNodeId]);

            // 2. 还原新节点的 desc
            if (n.originalDesc) {
              await FlowEasy.editNodeDesc(session.flowId, n.newNodeId, n.originalDesc);
            } else {
              // 清除 session marker
              const newNode = await FlowEasy.queryNode(n.newNodeId, session.flowId);
              const currentDesc = (newNode.desc || '').replace(new RegExp(`\\[编辑中\\|session:${sessionId}\\]\\s*`), '');
              await FlowEasy.editNodeDesc(session.flowId, n.newNodeId, currentDesc);
            }
            console.log(`  ✓ ${n.originalNodeId} → ${n.newNodeId}`);
            ok++;
          } catch (e) {
            console.log(`  ✗ ${n.originalNodeId}: ${e.message}`);
            fail++;
          }
        }

        // 删除已提交的 session
        delete data.sessions[sessionId];
        saveSessions(data);

        console.log(`\n提交完成: ${ok} 成功, ${fail} 失败`);
        break;
      }

      case 'edit-session-rollback': {
        if (!opts['session-id']) {
          console.log('用法: edit-session-rollback --session-id <id>');
          console.log('  回滚：删除新节点，重新启用原节点');
          break;
        }
        const sessionId = opts['session-id'];
        const data = loadSessions();
        const session = data.sessions[sessionId];
        if (!session) {
          console.log(`未找到会话 ${sessionId}`);
          break;
        }

        console.log(`回滚会话 ${sessionId} (${session.nodes.length} 个节点)...\n`);
        let ok = 0, fail = 0;
        for (const n of session.nodes) {
          try {
            // 1. 删除新节点
            console.log(`  删除新节点 ${n.newNodeId} (${n.nodeName}) ...`);
            await FlowEasy.delNode(session.flowId, [n.newNodeId]);

            // 2. 重新启用原节点
            await FlowEasy.editNodeStatus(session.flowId, [n.originalNodeId], true);
            console.log(`  ✓ ${n.originalNodeId} 已恢复启用`);
            ok++;
          } catch (e) {
            console.log(`  ✗ ${n.originalNodeId}: ${e.message}`);
            fail++;
          }
        }

        delete data.sessions[sessionId];
        saveSessions(data);

        console.log(`\n回滚完成: ${ok} 成功, ${fail} 失败`);
        break;
      }

      case 'edit-session-list': {
        const data = loadSessions();
        const ids = Object.keys(data.sessions);
        if (ids.length === 0) {
          console.log('(无活跃会话)');
        } else {
          console.log(`活跃会话 (${ids.length}):\n`);
          for (const [id, s] of Object.entries(data.sessions)) {
            console.log(`  ${id}`);
            console.log(`    创建时间: ${s.createdAt}`);
            console.log(`    flowId: ${s.flowId}`);
            console.log(`    节点数: ${s.nodes.length}`);
            for (const n of s.nodes) {
              console.log(`      ${n.nodeName}: ${n.originalNodeId} (禁用) → ${n.newNodeId} (编辑中)`);
            }
          }
          console.log(`\n会话文件: ${SESSION_FILE}`);
        }
        break;
      }

      case 'edit-session-clean': {
        if (!opts['session-id']) {
          console.log('用法: edit-session-clean --session-id <id>');
          console.log('  强制清理：删除新节点和原节点（用于修复异常残留）');
          break;
        }
        const sessionId = opts['session-id'];
        const data = loadSessions();
        const session = data.sessions[sessionId];
        if (!session) {
          console.log(`未找到会话 ${sessionId}`);
          break;
        }

        console.log(`⚠ 强制清理会话 ${sessionId}：将删除所有关联节点！`);
        let ok = 0, fail = 0;
        for (const n of session.nodes) {
          try {
            await FlowEasy.delNode(session.flowId, [n.originalNodeId, n.newNodeId]);
            console.log(`  ✓ 已删除 ${n.nodeName}: ${n.originalNodeId}, ${n.newNodeId}`);
            ok++;
          } catch (e) {
            console.log(`  ✗ ${n.originalNodeId}: ${e.message}`);
            fail++;
          }
        }

        delete data.sessions[sessionId];
        saveSessions(data);

        console.log(`\n清理完成: ${ok} 成功, ${fail} 失败`);
        break;
      }

      // === Batch ===
      case 'scan': {
        // scan defaults to finding all URL/IP patterns unless --keyword is given
        await cmdScan(opts);
        break;
      }
      case 'replace': {
        if (!opts.from || !opts.to) { console.log('用法: replace --project <name> --from <old> --to <new> [--no-dry-run]'); break; }
        await cmdReplace(opts);
        break;
      }

      // === Raw ===
      case 'raw': {
        if (!opts.method || !opts.path) { console.log('用法: raw --method <GET|POST> --path <path> [--body \'<json>\']'); break; }
        const body = opts.body ? JSON.parse(opts.body) : null;
        const result = await api(opts.method, opts.path, body);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      default:
        console.log(`流程易 CLI 驱动

用法:
  node driver.mjs <command> [options]

查询:
  list-projects                              列出所有项目
  list-flows      --project <name|id>         列出流程
  show-flow       --flow-id <id>              查看流程详情
  show-node       --flow-id <id> --node-id <id>  查看节点
  search          --flow-id <id> --keyword <kw>  搜索流程
  search-all      --project <name> --keyword <kw> 跨流程搜索

组件管理:
  list-modules                                列出所有可用组件
  show-module     --module-id <id>             查看组件定义

流程节点:
  add-node        --flow-id <id> --module-id <id> --prefix-node-id <id> [--type <add|after>]
                                              添加流程节点
  del-node        --flow-id <id> --node-ids <id1,id2,...>
                                              删除流程节点
  toggle-node     --flow-id <id> --node-ids <id1,id2,...> (--enable|--disable)
                                              启用/禁用流程节点
  edit-custom-attr --flow-id <id> --node-id <id> --custom-attr '<json>'
                                              修改节点自定义属性(customAttr)
  edit-node-desc  --flow-id <id> --node-id <id> --desc <描述>
                                              修改节点描述(备注)

流程参数:
  query-params    --flow-id <id>              查询流程入参/出参
  add-param       --flow-id <id> --name <name> [--default <val>] [--value-type <type>] [--param-type <0|1>] [--desc <desc>]
                                              添加流程参数 (0=入参, 1=出参)
  update-param    --flow-id <id> --param-id <id> --name <name> [--value-type <type>] [--param-type <0|1>] [--desc <desc>]
                                              修改流程参数
  del-param       --flow-id <id> --param-id <id>
                                              删除流程参数

全局变量:
  query-global    --flow-id <id>              查询全局变量
  add-global      --flow-id <id> --name <name> [--value <v>] [--value-type <t>] [--desc <d>] [--encrypt <0|1>]
                                              添加全局变量
  del-global      --flow-id <id> --var-id <id>
                                              删除全局变量

修改:
  edit-node       --flow-id <id> --node-id <id> --param-id <id> --value <v>
                  [--display <d>] [--name <n>] [--value-type <t>]
  edit-global     --flow-id <id> --var-id <id> --value <v>
                  [--name <n>] [--value-type <t>]
  edit-flow-desc  --flow-id <id> --desc <描述>
                                              修改流程描述
  rename-flow     --flow-id <id> --name <新名称>
                                              重命名流程

批量:
  scan            --project <name> [--keyword <kw>]    扫描 URL/IP
  replace         --project <name> --from <old> --to <new> [--no-dry-run]
                                              批量查找替换

便捷命令:
  replace-module  --flow-id <id> --old-node-id <id> --new-module-id <id>
                                              一键替换组件类型 (add→复制参数→复制customAttr→del)

安全编辑:
  edit-session-start --flow-id <id> --node-id <id> [--session-id <id>]
                                              开始安全编辑 (复制节点→禁用原节点)
  edit-session-commit --session-id <id>       提交修改 (删除原节点→还原desc)
  edit-session-rollback --session-id <id>     回滚修改 (删除新节点→启用原节点)
  edit-session-list                           列出所有活跃的编辑会话
  edit-session-clean --session-id <id>        强制清理会话 (删除新旧节点)

代码:
  translate       --flow-id <id>              翻译 Python 代码
  code-to-card    --flow-id <id> --line <n>   代码行→组件 ID

底层:
  raw             --method <GET|POST> --path <path> [--body '<json>']

环境变量:
  FLOWEASY_API    默认 http://127.0.0.1:5555
                 设置远程地址: set FLOWEASY_API=http://<remote-ip>:5555

示例:
  # 远程连接
  set FLOWEASY_API=http://192.168.1.100:5555
  node driver.mjs list-projects

  # 一键替换组件类型
  node driver.mjs replace-module --flow-id <flowId> --old-node-id <oldId> --new-module-id <newModuleId>

  # 安全编辑流程（推荐）
  node driver.mjs edit-session-start --flow-id <flowId> --node-id <nodeId>
  # → 修改新节点参数 ...
  node driver.mjs edit-node --flow-id <flowId> --node-id <新nodeId> --param-id <paramId> --value "新值"
  # → 验证通过后提交
  node driver.mjs edit-session-commit --session-id <sessionId>
  # → 或者回滚还原
  node driver.mjs edit-session-rollback --session-id <sessionId>

  # 管理全局变量
  node driver.mjs query-global --flow-id <flowId>
  node driver.mjs add-global --flow-id <flowId> --name "新变量" --value "默认值"
  node driver.mjs del-global --flow-id <flowId> --var-id <varId>

  # 找到 12345 登录 URL 并替换
  node driver.mjs scan --project 天河
  node driver.mjs replace --project 天河 --from "http://10.194.253.52:8082" --to "http://新地址"

  # 搜索所有流程中引用了某个 IP 的组件
  node driver.mjs scan --project 天河 --keyword "10.194"

  # 查看一个流程的完整结构
  node driver.mjs show-flow --flow-id 998912b2-6e01-11f1-b3cb-ac198e0d98c2

  # 列出所有可用组件
  node driver.mjs list-modules

  # 向流程添加一个组件节点
  node driver.mjs add-node --flow-id <flowId> --module-id <moduleId> --prefix-node-id <prevNodeId>

  # 删除流程节点
  node driver.mjs del-node --flow-id <flowId> --node-ids "nodeId1,nodeId2"

  # 管理流程参数
  node driver.mjs query-params --flow-id <flowId>
  node driver.mjs add-param --flow-id <flowId> --name "新参数" --param-type 0
  node driver.mjs del-param --flow-id <flowId> --param-id <paramId>

  # 修改描述
  node driver.mjs edit-flow-desc --flow-id <flowId> --desc "新描述"
  node driver.mjs edit-node-desc --flow-id <flowId> --node-id <nodeId> --desc "备注"

  # 调用任意 API
  node driver.mjs raw --method GET --path /projectManagement/query_project/
  node driver.mjs raw --method POST --path /flowList/queryflowlist/ --body '{"projectId":"...","type":"flat"}'
`);
        break;
    }
  } catch (e) {
    console.error(`错误: ${e.message}`);
    if (e.message.includes('fetch') || e.message.includes('ECONNREFUSED')) {
      console.error('\n流程易 API 未响应。请确认:');
      console.error('  1. 流程易桌面应用已启动');
      console.error('  2. API 监听在 http://127.0.0.1:5555');
      console.error('  3. 可通过 FLOWEASY_API 环境变量指定其他地址');
    }
    process.exit(1);
  }
}

main();
