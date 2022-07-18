import expect from 'expect'
import fs from 'fs-extra'

import { compareStatePayloads, parseStateString } from './utils'
import { createSandbox } from './utils/sandbox'
import { getDataPath, readByLine } from './utils/snapshot'
const messages = []
afterAll(() => {
  // HACK to log all the messages after the describe/it logs for this test.
  // 🧙‍♂️✨
  setTimeout(() => {
    messages.forEach((m) => process.stdout.write('\t' + m))
  }, 0)
})

describe('CRDT process generated messages', () => {
  it('> ', async () => {
    const path = getDataPath('')
    for await (const file of await fs.readdir(path)) {
      let crdt = createSandbox({ clientLength: 1 }).clients[0]
      let testSpecName: string
      let nextLineIsState = false

      function resetCrdt() {
        nextLineIsState = false
        testSpecName = undefined
        crdt = createSandbox({ clientLength: 1 }).clients[0]
      }

      for await (const line of readByLine(file)) {
        if (line === '#') continue

        if (line.startsWith('#')) {
          testSpecName ??= line
        }

        if (line === '# Final CRDT State') {
          nextLineIsState = true
          continue
        }

        if (line.startsWith('{') && line.endsWith('}')) {
          if (nextLineIsState) {
            const msg = parseStateString(line)
            const isValid = compareStatePayloads([crdt.getState(), msg])
            expect.setState({ currentTestName: testSpecName })
            if (!isValid) {
              messages.push(`\x1b[31m✕ \x1b[0m${testSpecName}  [./${file}]\n`)
              expect(isValid).toBe(true)
            } else {
              messages.push(`\x1b[32m✓ \x1b[0m${testSpecName}  [./${file}]\n`)
            }
            resetCrdt()
          } else {
            const msg = JSON.parse(line)
            crdt.processMessage(msg)
          }
          continue
        }
      }
    }
  })
})
