// 代码质量检查工具

import { promises as fs } from 'fs'
import path from 'path'

// 代码质量问题类型
export interface QualityIssue {
  type: 'error' | 'warning' | 'info'
  category: string
  message: string
  file: string
  line?: number
  suggestion?: string
}

// 代码质量检查器
export class CodeQualityChecker {
  private issues: QualityIssue[] = []
  
  // 检查API路由文件
  async checkApiRoute(filePath: string): Promise<QualityIssue[]> {
    this.issues = []
    
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      
      this.checkImports(content, filePath)
      this.checkErrorHandling(content, filePath, lines)
      this.checkValidation(content, filePath, lines)
      this.checkDatabaseInitialization(content, filePath)
      this.checkResponseFormat(content, filePath, lines)
      this.checkSecurityIssues(content, filePath, lines)
      this.checkPerformanceIssues(content, filePath, lines)
      this.checkCodeDuplication(content, filePath)
      
    } catch (error) {
      this.addIssue('error', 'File Access', `无法读取文件: ${error}`, filePath)
    }
    
    return this.issues
  }
  
  // 检查导入语句
  private checkImports(content: string, filePath: string) {
    // 检查是否使用了相对路径导入
    if (content.includes("from '../") || content.includes("from './")) {
      this.addIssue('warning', 'Imports', '建议使用绝对路径导入(@/)', filePath, undefined, '使用 @/ 别名进行导入')
    }
    
    // 检查是否导入了未使用的模块
    const importMatches = content.match(/import\s+{([^}]+)}\s+from/g)
    if (importMatches) {
      importMatches.forEach(importStatement => {
        const imports = importStatement.match(/{([^}]+)}/)?.[1]
        if (imports) {
          imports.split(',').forEach(imp => {
            const trimmedImport = imp.trim()
            if (!content.includes(trimmedImport.replace(/\s+as\s+\w+/, ''))) {
              this.addIssue('warning', 'Imports', `未使用的导入: ${trimmedImport}`, filePath)
            }
          })
        }
      })
    }
  }
  
  // 检查错误处理
  private checkErrorHandling(content: string, filePath: string, lines: string[]) {
    // 检查是否有try-catch块
    const hasTryCatch = content.includes('try {') && content.includes('} catch')
    if (!hasTryCatch) {
      this.addIssue('error', 'Error Handling', 'API路由缺少错误处理', filePath, undefined, '添加try-catch块处理异常')
    }
    
    // 检查是否记录错误日志
    lines.forEach((line, index) => {
      if (line.includes('} catch') && !content.includes('console.error')) {
        this.addIssue('warning', 'Error Handling', '建议在catch块中记录错误日志', filePath, index + 1)
      }
    })
    
    // 检查是否返回了适当的错误状态码
    if (content.includes('catch') && !content.includes('status: 500')) {
      this.addIssue('warning', 'Error Handling', '建议在错误处理中返回适当的HTTP状态码', filePath)
    }
  }
  
  // 检查输入验证
  private checkValidation(content: string, filePath: string, lines: string[]) {
    // 检查是否验证必填字段
    if (content.includes('request.json()') && !content.includes('if (!')) {
      this.addIssue('warning', 'Validation', '建议添加输入验证', filePath, undefined, '验证必填字段和数据类型')
    }
    
    // 检查是否验证数据类型
    lines.forEach((line, index) => {
      if (line.includes('parseInt(') && !line.includes('isNaN(')) {
        this.addIssue('warning', 'Validation', '建议验证parseInt的结果', filePath, index + 1, '使用isNaN检查转换结果')
      }
    })
    
    // 检查SQL注入防护
    if (content.includes('query(') && content.includes('${')) {
      this.addIssue('error', 'Security', '可能存在SQL注入风险', filePath, undefined, '使用参数化查询')
    }
  }
  
  // 检查数据库初始化
  private checkDatabaseInitialization(content: string, filePath: string) {
    // 检查是否有重复的数据库初始化代码
    if (content.includes('ensureDbInitialized')) {
      this.addIssue('info', 'Code Duplication', '发现重复的数据库初始化代码', filePath, undefined, '考虑使用中间件统一处理')
    }
    
    // 检查是否在每个路由中都初始化了数据库
    const exportFunctions = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE)/g)
    if (exportFunctions && exportFunctions.length > 0) {
      exportFunctions.forEach(func => {
        if (!content.includes('await ensureDbInitialized()')) {
          this.addIssue('warning', 'Database', '建议在API路由中初始化数据库', filePath)
        }
      })
    }
  }
  
  // 检查响应格式
  private checkResponseFormat(content: string, filePath: string, lines: string[]) {
    // 检查是否使用了一致的响应格式
    const hasSuccessField = content.includes('success: true') || content.includes('success: false')
    if (!hasSuccessField) {
      this.addIssue('warning', 'Response Format', '建议使用标准化的响应格式', filePath, undefined, '包含success字段的响应格式')
    }
    
    // 检查是否设置了适当的状态码
    lines.forEach((line, index) => {
      if (line.includes('NextResponse.json(') && !line.includes('status:')) {
        this.addIssue('info', 'Response Format', '建议明确设置HTTP状态码', filePath, index + 1)
      }
    })
  }
  
  // 检查安全问题
  private checkSecurityIssues(content: string, filePath: string, lines: string[]) {
    // 检查是否暴露了敏感信息
    lines.forEach((line, index) => {
      if (line.includes('console.log(') && (line.includes('password') || line.includes('token'))) {
        this.addIssue('error', 'Security', '可能暴露敏感信息', filePath, index + 1, '避免在日志中输出敏感数据')
      }
    })
    
    // 检查是否有CORS配置
    if (!content.includes('Access-Control-Allow-Origin')) {
      this.addIssue('info', 'Security', '建议配置CORS头部', filePath, undefined, '添加适当的CORS配置')
    }
    
    // 检查是否有速率限制
    if (!content.includes('rate') && !content.includes('limit')) {
      this.addIssue('info', 'Security', '建议添加速率限制', filePath, undefined, '防止API滥用')
    }
  }
  
  // 检查性能问题
  private checkPerformanceIssues(content: string, filePath: string, lines: string[]) {
    // 检查是否有分页
    if (content.includes('getAllOrders') && !content.includes('limit')) {
      this.addIssue('warning', 'Performance', '建议为列表查询添加分页', filePath, undefined, '避免返回大量数据')
    }
    
    // 检查是否有缓存
    if (!content.includes('cache') && content.includes('GET')) {
      this.addIssue('info', 'Performance', '考虑添加缓存机制', filePath, undefined, '提高查询性能')
    }
    
    // 检查是否有不必要的数据库查询
    const dbCallCount = (content.match(/await\s+\w+Service\./g) || []).length
    if (dbCallCount > 3) {
      this.addIssue('warning', 'Performance', '可能存在过多的数据库查询', filePath, undefined, '考虑合并查询或使用事务')
    }
  }
  
  // 检查代码重复
  private checkCodeDuplication(content: string, filePath: string) {
    // 检查重复的验证逻辑
    const validationPatterns = [
      /if \(!\w+ \|\| \w+ === undefined\)/g,
      /if \(\w+ <= 0\)/g
    ]
    
    validationPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches && matches.length > 2) {
        this.addIssue('info', 'Code Duplication', '发现重复的验证逻辑', filePath, undefined, '考虑提取为公共函数')
      }
    })
    
    // 检查重复的错误处理
    const errorHandlingPattern = /NextResponse\.json\(\s*{\s*success:\s*false/g
    const errorMatches = content.match(errorHandlingPattern)
    if (errorMatches && errorMatches.length > 3) {
      this.addIssue('info', 'Code Duplication', '发现重复的错误处理代码', filePath, undefined, '考虑使用统一的错误处理函数')
    }
  }
  
  // 添加问题
  private addIssue(
    type: 'error' | 'warning' | 'info',
    category: string,
    message: string,
    file: string,
    line?: number,
    suggestion?: string
  ) {
    this.issues.push({
      type,
      category,
      message,
      file: path.basename(file),
      line,
      suggestion
    })
  }
}

// 代码质量报告生成器
export class QualityReporter {
  // 生成报告
  static generateReport(issues: QualityIssue[]): string {
    if (issues.length === 0) {
      return '🎉 代码质量检查通过，未发现问题！'
    }
    
    const errorCount = issues.filter(i => i.type === 'error').length
    const warningCount = issues.filter(i => i.type === 'warning').length
    const infoCount = issues.filter(i => i.type === 'info').length
    
    let report = `\n📊 代码质量检查报告\n`
    report += `${'='.repeat(50)}\n`
    report += `❌ 错误: ${errorCount}\n`
    report += `⚠️  警告: ${warningCount}\n`
    report += `ℹ️  建议: ${infoCount}\n`
    report += `${'='.repeat(50)}\n\n`
    
    // 按类型分组显示问题
    const groupedIssues = this.groupIssuesByType(issues)
    
    Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
      const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
      report += `${icon} ${type.toUpperCase()}\n`
      report += `${'-'.repeat(30)}\n`
      
      typeIssues.forEach((issue, index) => {
        report += `${index + 1}. [${issue.category}] ${issue.message}\n`
        report += `   📁 文件: ${issue.file}`
        if (issue.line) {
          report += ` (第${issue.line}行)`
        }
        report += `\n`
        if (issue.suggestion) {
          report += `   💡 建议: ${issue.suggestion}\n`
        }
        report += `\n`
      })
    })
    
    return report
  }
  
  // 按类型分组问题
  private static groupIssuesByType(issues: QualityIssue[]): Record<string, QualityIssue[]> {
    return issues.reduce((groups, issue) => {
      if (!groups[issue.type]) {
        groups[issue.type] = []
      }
      groups[issue.type].push(issue)
      return groups
    }, {} as Record<string, QualityIssue[]>)
  }
  
  // 生成JSON报告
  static generateJsonReport(issues: QualityIssue[]): string {
    const report = {
      summary: {
        total: issues.length,
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        info: issues.filter(i => i.type === 'info').length
      },
      issues: issues
    }
    
    return JSON.stringify(report, null, 2)
  }
}

// 批量检查API文件
export async function checkApiDirectory(apiDir: string): Promise<QualityIssue[]> {
  const checker = new CodeQualityChecker()
  const allIssues: QualityIssue[] = []
  
  async function checkDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        await checkDirectory(fullPath)
      } else if (entry.name.endsWith('.ts') && entry.name.includes('route')) {
        const issues = await checker.checkApiRoute(fullPath)
        allIssues.push(...issues)
      }
    }
  }
  
  await checkDirectory(apiDir)
  return allIssues
}