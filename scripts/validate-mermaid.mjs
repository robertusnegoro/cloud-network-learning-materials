#!/usr/bin/env node

/**
 * Mermaid Diagram Syntax & Schema Validator
 * 
 * Automatically discovers, sanitizes, and verifies all ```mermaid fences
 * across the entire documentation codebase to ensure zero render warnings/errors in production.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dompurifyMod from 'dompurify'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const docsDir = path.join(rootDir, 'docs')

// Attach DOMPurify methods in Node environment
const DOMPurify = dompurifyMod?.default || dompurifyMod
Object.assign(DOMPurify, {
  sanitize: (val) => (typeof val === 'string' ? val : ''),
  addHook: () => {},
  setConfig: () => {},
  clearConfig: () => {},
  isValidAttribute: () => true,
  reset: () => {},
  removed: []
})

// Initialize minimal DOM mock required for Mermaid's parser in Node.js
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { href: 'http://localhost' },
  navigator: { userAgent: 'Node.js/Mermaid-Validator' },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  document: {
    createElement: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      removeChild: () => {},
      style: {},
      querySelector: () => null,
      querySelectorAll: () => []
    }),
    createElementNS: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      removeChild: () => {},
      style: {},
      querySelector: () => null,
      querySelectorAll: () => []
    }),
    getElementsByTagName: () => [],
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { appendChild: () => {}, removeChild: () => {} },
    documentElement: { style: {} }
  }
}
globalThis.document = globalThis.window.document

// Sanitization logic matching MermaidRenderer.vue
function sanitizeMermaid(raw) {
  return raw
    .replace(/^\s*classDef\s+.*$/gm, '')
    .replace(/^\s*class\s+[A-Za-z0-9_,\s]+\s+[A-Za-z0-9_-]+;?\s*$/gm, '')
    .replace(/^\s*style\s+.*$/gm, '')
    .replace(/\|([^"\|\n]+[\(\)\[\]\{\}][^"\|\n]*)\|/g, '|"$1"|')
    .trim()
}

// Recursively find all .md files
function findMarkdownFiles(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        results = results.concat(findMarkdownFiles(filePath))
      }
    } else if (file.endsWith('.md')) {
      results.push(filePath)
    }
  }
  return results
}

// Extract ```mermaid blocks with line numbers
function extractMermaidBlocks(filePath, content) {
  const lines = content.split('\n')
  const blocks = []
  let inBlock = false
  let currentBlockLines = []
  let startLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!inBlock && line.trim().startsWith('```mermaid')) {
      inBlock = true
      startLine = i + 1
      currentBlockLines = []
    } else if (inBlock && line.trim() === '```') {
      inBlock = false
      blocks.push({
        filePath,
        startLine,
        endLine: i + 1,
        code: currentBlockLines.join('\n')
      })
      currentBlockLines = []
    } else if (inBlock) {
      currentBlockLines.push(line)
    }
  }
  return blocks
}

async function runValidator() {
  console.log('🔍 Scanning repository for Mermaid diagrams...')
  const mdFiles = findMarkdownFiles(docsDir)
  const allBlocks = []

  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const blocks = extractMermaidBlocks(file, content)
    allBlocks.push(...blocks)
  }

  console.log(`📊 Found ${allBlocks.length} Mermaid diagram(s) across ${mdFiles.length} markdown file(s).\n`)

  const mermaidModule = await import('mermaid')
  const mermaid = mermaidModule.default
  mermaid.initialize({
    startOnLoad: false,
    suppressErrorRendering: true,
    securityLevel: 'loose'
  })

  let passed = 0
  let failed = 0
  const errors = []

  for (const block of allBlocks) {
    const relPath = path.relative(rootDir, block.filePath)
    const sanitized = sanitizeMermaid(block.code)

    try {
      await mermaid.parse(sanitized)
      passed++
      process.stdout.write('.')
    } catch (err) {
      failed++
      process.stdout.write('F')
      errors.push({
        file: relPath,
        startLine: block.startLine,
        endLine: block.endLine,
        error: err.message || String(err),
        codeSnippet: block.code.trim()
      })
    }
  }

  console.log('\n')

  if (failed > 0) {
    console.error(`❌ Validation FAILED: ${failed} diagram(s) have syntax errors:\n`)
    for (const [idx, err] of errors.entries()) {
      console.error(`[${idx + 1}] File: ${err.file}:${err.startLine}`)
      console.error(`    Error: ${err.error.split('\n')[0]}`)
      console.error('    Snippet:')
      const snippetLines = err.codeSnippet.split('\n').slice(0, 6)
      for (const s of snippetLines) {
        console.error(`      | ${s}`)
      }
      console.error('')
    }
    process.exit(1)
  } else {
    console.log(`✅ Success! All ${passed} Mermaid diagram(s) parsed and validated without any syntax errors.`)
    process.exit(0)
  }
}

runValidator().catch((err) => {
  console.error('Fatal validator error:', err)
  process.exit(1)
})
