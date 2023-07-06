type Operator = '+' | '-' | '*' | '/';
// type DigitIndex = 0 | 1 | 2 | 3;

class Segment {
  // protected text = '';
  private expressions = new Set<string>();
  private value = 0;
  protected usedDigits = 0;
  protected _isValid = false;
  protected _isNumber = false;
  private _isComplete = false;
  private _isSolution = false;
  private _isCommutative = false;
  private _isDistributive = false;

  constructor(
    protected operator?: Operator,
    protected operandA?: Segment,
    protected operandB?: Segment
  ) {
    this.setUsedDigits();
    this._isComplete = this.usedDigits === 15; // 0b1111
    if (this.operator) {
      this._isCommutative = ['+', '*'].includes(this.operator);
      this._isDistributive = ['+', '-'].includes(this.operator);
    }
  }

  /**
   * Checks if there is any duplicate digit index in the combination of both segments.
   *
   * `3`(`0b0011`) and `10`(`0b1010`) return `false` because
   * they have a common digit index in the second bit.
   *
   * `8`(`0b1000`) and `6`(`0b0110`) return `true` because
   * they don't have any digit index bit in common.
   *
   * @static
   * @param {Segment} segmentA
   * @param {Segment} segmentB
   * @returns {boolean}
   * @memberof Segment
   */
  static haveRepeatingDigits(segmentA: Segment, segmentB: Segment): boolean {
    return (
      (segmentA.usedDigits | segmentB.usedDigits) !==
      (segmentA.usedDigits ^ segmentB.usedDigits)
    );
  }

  protected iterateExpressions(
    consumer: (expressionA: string, expressionB?: string) => void,
    thisArg?: any
  ) {
    if (this.operandA) {
      this.operandA.expressions.forEach(expressionA => {
        if (this.operandB) {
          this.operandB.expressions.forEach(expressionB =>
            consumer.call(thisArg, expressionA, expressionB)
          );
        } else {
          consumer.call(thisArg, expressionA);
        }
      });
    }
  }

  isComplete(): boolean {
    return this._isComplete;
  }

  isCommutative(): boolean {
    return this._isCommutative;
  }

  isDistributive(): boolean {
    return this._isDistributive;
  }

  isNumber(): boolean {
    return this._isNumber;
  }

  isSolution(): boolean {
    return this._isSolution;
  }

  isValid(): boolean {
    return this._isValid;
  }

  getValue(): number {
    return this.value;
  }

  protected setValue(value: number) {
    this.value = value;
    if (this._isComplete && 0 < value && value <= 100) {
      this._isSolution = true;
    }
  }

  protected addExpression(text: string) {
    this.expressions.add(text);
  }

  equals(segment: Segment): boolean {
    return (
      this.value === segment.value &&
      Array.from(this.expressions.values()).some(expression =>
        segment.expressions.has(expression)
      )
    );
  }

  toString(): string {
    return this.expressions.values().next().value;
  }

  private setUsedDigits() {
    if (this.operandA) {
      this.usedDigits = this.operandA.usedDigits;

      if (this.operandB) {
        this.usedDigits |= this.operandB.usedDigits;
      }
    }
  }
}

class DigitSegment extends Segment {
  constructor(digit: number, digitIndex: number) {
    super();
    this.addExpression(digit.toString());
    this.setValue(digit);
    this.setDigitIndex(digitIndex);
    this._isValid = true;
    this._isNumber = true;
  }

  private setDigitIndex(index: number) {
    if (index < 0 || 3 < index) {
      console.error('🚀 ~ Segment ~ setDigitIndex ~ index:', index);
      throw 'Invalid digit index argument.';
    }
    this.usedDigits = Math.pow(2, index);
  }
}

class Combination extends Segment {
  constructor(numberA: Segment, numberB: Segment) {
    super(undefined, numberA, numberB);
    this.validate(numberA, numberB);
    if (!this.isValid()) return;

    const multiplier = Math.pow(10, numberB.getValue().toString().length);
    const value = numberA.getValue() * multiplier + numberB.getValue();
    this.addExpression(value.toString());
    this.setValue(value);
    this._isNumber = true;
  }

  /**
   * both segments should be numbers to be able combine
   * the first digit cannot be zero
   * the new number should be less than four digits
   *
   * @private
   * @param {Segment} numberA
   * @param {Segment} numberB
   * @memberof Combination
   */
  private validate(numberA: Segment, numberB: Segment) {
    this._isValid =
      !Segment.haveRepeatingDigits(numberA, numberB) &&
      numberA.isNumber() &&
      numberB.isNumber() &&
      numberA.getValue() !== 0 &&
      !this.isComplete();
  }
}

class Addition extends Segment {
  constructor(operandA: Segment, operandB: Segment) {
    super('+', operandA, operandB);

    this.setValue(operandA.getValue() + operandB.getValue());
    this.validate(operandA, operandB);
    if (!this.isValid()) return;

    this.iterateExpressions((expressionA, expressionB) => {
      this.addExpression(`${expressionA} + ${expressionB}`);
      this.addExpression(`${expressionB} + ${expressionA}`);
    });
  }

  private validate(operandA: Segment, operandB: Segment) {
    this._isValid =
      !Segment.haveRepeatingDigits(operandA, operandB) &&
      ((this.isComplete() && this.isSolution()) || !this.isComplete());
  }
}

class Subtraction extends Segment {
  constructor(operandA: Segment, operandB: Segment) {
    super('-', operandA, operandB);

    this.setValue(operandA.getValue() - operandB.getValue());
    this.validate(operandA, operandB);
    if (!this.isValid()) return;

    this.iterateExpressions((expressionA, expressionB) => {
      expressionB = operandB.isDistributive()
        ? `(${expressionB})`
        : expressionB;
      this.addExpression(`${expressionA} - ${expressionB}`);
    });
  }

  private validate(operandA: Segment, operandB: Segment) {
    this._isValid =
      !Segment.haveRepeatingDigits(operandA, operandB) &&
      ((this.isComplete() && this.isSolution()) || !this.isComplete());
  }
}

////////////////////////
// Calculator
////////////////////////
class Calculator {
  private readonly segments: Segment[] = [];
  private readonly solutions = new Map<number, string[]>();

  constructor(digits: number[]) {
    if (!Array.isArray(digits) || digits.length !== 4) {
      console.log('🚀 ~ Calculator ~ constructor ~ digits:', digits);
      throw 'Invalid digits argument.';
    }
    digits.forEach(this.addDigit, this);
    this.addNumberCombinations();
    this.generateOperations();
  }

  private addSegments(...segments: Segment[]): Segment[] {
    this.segments.push(...segments);
    return segments;
  }

  private addDigit(digit: number, digitIndex: number) {
    this.segments.push(new DigitSegment(digit, digitIndex));
  }

  private addNumberCombinations() {
    const twoDigits: Segment[] = [];
    const threeDigits: Segment[] = [];

    // add two digits
    this.segments.forEach(numberA =>
      this.segments.forEach(numberB => {
        const newTwoDigit = new Combination(numberA, numberB);
        if (
          newTwoDigit.isValid() &&
          !twoDigits.some(
            twoDigit => twoDigit.getValue() === newTwoDigit.getValue()
          )
        ) {
          twoDigits.push(newTwoDigit);
        }

        // add three digits
        this.segments.forEach(numberC => {
          const newThreeDigit = new Combination(newTwoDigit, numberC);
          if (
            newThreeDigit.isValid() &&
            !threeDigits.some(
              threeDigit => threeDigit.getValue() === newThreeDigit.getValue()
            )
          ) {
            threeDigits.push(newThreeDigit);
          }
        });
      })
    );

    this.addSegments(...twoDigits, ...threeDigits);
  }

  private addSolution(value: number, text: string) {
    if (this.solutions.has(value)) {
      this.solutions.get(value)?.push(text);
    } else {
      this.solutions.set(value, [text]);
    }
  }

  private operationExistsIn(
    operation: Segment,
    operationList: Segment[]
  ): boolean {
    return operationList.some(segment => segment.equals(operation));
  }

  private addOperation(operation: Segment, operationList: Segment[]) {
    if (
      operation.isValid() &&
      !this.operationExistsIn(operation, operationList) &&
      !this.operationExistsIn(operation, this.segments)
    ) {
      operationList.push(operation);
      if (operation.isSolution()) {
        this.addSolution(operation.getValue(), operation.toString());
      }
    }
  }

  private generateOperations() {
    let newOperations: Segment[];
    let i = 0;
    do {
      newOperations = [];
      this.segments.forEach(segmentA =>
        this.segments.forEach(segmentB => {
          if (!Segment.haveRepeatingDigits(segmentA, segmentB)) {
            this.addOperation(new Addition(segmentA, segmentB), newOperations);
            this.addOperation(
              new Subtraction(segmentA, segmentB),
              newOperations
            );
          }
        })
      );
      this.addSegments(...newOperations);
      console.log(++i);
    } while (newOperations.length > 0);
  }

  getSolutions() {
    const solutionsObj: {[key: number]: string[]} = {};
    Array.from(this.solutions.entries())
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .forEach(([value, solutions]) => (solutionsObj[value] = solutions));
    return solutionsObj;
  }

  printSegments() {
    const output = this.segments
      .map(segment => `${segment.getValue()} = ${segment.toString()}`)
      .join('\n');
    console.log(output);
  }

  printSolutions() {
    const output = Array.from(this.solutions.entries())
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .map(
        ([value, solutions]) =>
          `${value}\n${solutions.map(solution => `  = ${solution}`).join('\n')}`
      )
      .join('\n');
    console.log(output);
  }
}
