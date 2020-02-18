import fs from "fs-extra"
import tempy from "tempy"
import childProcess from "child-process-es6-promise"
import { ScriptError } from "../ScriptError"

const parseTables = (rules) => {
  const parseRawTables = (rules) => {
    const regex = /^\s*\*(nat|filter|raw|mangle)\n((?:.*\n)*?)^\s*COMMIT\n?/gm
    let m
    let tables = {}

    while ((m = regex.exec(rules)) !== null) {
      tables[m[1]] = m[2]
    }

    return tables
  }

  const tables = parseRawTables(rules)

  Object.entries(tables).forEach(([tableName, rawLines], index) => {
    tables[tableName] = rawLines
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line[0] !== ":" && line[0] !== "#")
  })

  return tables
}

export class IPTablesContain {
  constructor(container) {
    this.fs = container.fs || fs
    this.tempy = container.tempy || tempy
    this.childProcess = container.childProcess || childProcess
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const { contents: contentsNode, ignore: ignoreNode } = withNode.value

    if (!contentsNode || contentsNode.type !== "string") {
      throw new ScriptError(
        "'contents' must be supplied and be a string",
        contentsNode || withNode
      )
    }

    this.contents = this.interpolator(contentsNode)

    const ignoredTables = {}

    if (ignoreNode) {
      if (ignoreNode.type !== "object") {
        throw new ScriptError("'ignore' must be an object", ignoreNode)
      }

      for (const [tableName, tableNode] of Object.entries(ignoreNode.value)) {
        if (tableNode.type !== "array") {
          throw new ScriptError(`Ignore table must be an array`, tableNode)
        }

        const rules = []

        for (const ruleNode of tableNode.value) {
          if (ruleNode.type !== "string") {
            throw new ScriptError(
              `Rule must be a regular expression string`,
              ruleNode
            )
          }

          rules.push(new RegExp(ruleNode.value))
        }

        ignoredTables[tableName] = rules
      }
    }

    let child

    try {
      child = await this.childProcess.exec("iptables-save")
    } catch (e) {
      throw new ScriptError(
        `Unable to get existing rules. ${e.message}`,
        assertNode
      )
    }

    const compareTables = (existingTables, newTables, ignoredTables) => {
      const arePropertiesTheSame = (obj1, obj2) =>
        obj1.length === obj2.length &&
        Object.keys(obj1).every((key) => obj2.hasOwnProperty(key)) &&
        Object.keys(obj2).every((key) => obj1.hasOwnProperty(key))

      if (!arePropertiesTheSame(existingTables, newTables)) {
        return false
      }

      const isRuleIgnored = (tableName, rule) => {
        return (ignoredTables[tableName] ?? []).some((re) => re.test(rule))
      }

      // Go through each existing table
      for (const tableName of Object.keys(existingTables)) {
        const existingRules = existingTables[tableName]
        const newRules = newTables[tableName]
        let j = 0

        // Ensure each of the existing rules exists in the new rules,
        // in the same order, unless in the ignored rules list
        for (let i = 0; i < existingRules.length; i++) {
          if (isRuleIgnored(tableName, existingRules[i])) {
            continue
          }

          if (existingRules[i] !== newRules[j]) {
            return false
          }

          j += 1
        }
      }

      return true
    }

    return compareTables(
      parseTables(child.stdout),
      parseTables(this.contents),
      ignoredTables
    )
  }

  async rectify() {
    const tmpFile = this.tempy.file()

    try {
      await this.fs.writeFile(tmpFile, this.contents)
      await this.childProcess.exec(`iptables-restore < ${tmpFile}`)
    } finally {
      await fs.remove(tmpFile)
    }
  }

  result() {
    return { contents: this.contents }
  }
}
