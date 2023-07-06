function calculateSolutions(value: string): {[key: number]: string[]} {
  const digits = value.split(' ').map(text => Number.parseInt(text));
  const calc = new Calculator(digits);
  return calc.getSolutions();
}
