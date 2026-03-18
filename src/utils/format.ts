import chalk from 'chalk';

export function jsonError(message: string, code: string, exitCode: number): void {
  process.stderr.write(JSON.stringify({ error: message, code, exitCode }) + '\n');
  process.exitCode = exitCode;
}

export function header(text: string): void {
  console.log();
  console.log(chalk.bold.cyan(text));
  console.log(chalk.cyan('-'.repeat(text.length)));
}

export function row(label: string, value: string): void {
  console.log(`  ${chalk.gray(label.padEnd(22))} ${value}`);
}

export function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
