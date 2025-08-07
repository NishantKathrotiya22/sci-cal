class Calculator {
  constructor() {
    // State
    this.state = {
      result: null,
      display: "0",
      lastAction: null, // 'eval', 'operator', 'digit', etc.
    };
    this.frozen = false; // Prevent input when true
    this.memory = 0;
    this.angleMode = "deg";
    this.history = [];
    this.operators = ["+", "-", "*", "/"];
    this.openParens = 0; // Track open parentheses for trig functions

    // DOM Elements
    this.displayElement = document.getElementById("display");
    this.memoryElement = document.getElementById("memoryValue");
    this.historyList = document.getElementById("historyList");

    this.updateDisplay();
    this.init();
  }

  // Utility: Get last character of display
  getLastChar() {
    return this.state.display.slice(-1);
  }

  // Utility: Get second last character of display
  getSecondLastChar() {
    return this.state.display.slice(-2, -1);
  }

  // Utility: Get current number segment after last operator
  getCurrentNumber() {
    const expression = this.state.display;
    const lastOperatorIndex = Math.max(
      ...this.operators.map((op) => expression.lastIndexOf(op))
    );
    return expression.slice(lastOperatorIndex + 1);
  }

  // Update the display element
  updateDisplay() {
    this.displayElement.innerText = this.state.display || "0";
  }

  // Append value to display
  appendValue(val) {
    if (this.state.display === "0" && !this.state.result) {
      this.state.display = val;
    } else {
      this.state.display += val;
    }
    this.updateDisplay();
  }

  addAngleMode(expr) {
    const angleMode = this.angleMode || "deg";

    // Helper: Recursively process trig functions
    const addDegToTrig = (input) => {
      const trigPattern = /(sin|cos|tan|sec|csc|cot)\s*\(/g;

      let result = "";
      let i = 0;

      while (i < input.length) {
        const match = trigPattern.exec(input);

        if (!match) {
          result += input.slice(i);
          break;
        }

        const fnName = match[1];
        const fnStart = match.index;
        const parenStart = trigPattern.lastIndex;

        // Append everything before this function
        result += input.slice(i, fnStart);
        result += `${fnName}(`;

        // Extract full contents of the function using parentheses matching
        let depth = 1;
        let j = parenStart;
        while (j < input.length && depth > 0) {
          if (input[j] === "(") depth++;
          else if (input[j] === ")") depth--;
          j++;
        }

        const innerExpr = input.slice(parenStart, j - 1);
        const processedInner = addDegToTrig(innerExpr.trim());

        result += `${processedInner} ${angleMode})`;

        i = j; // Move pointer forward
        trigPattern.lastIndex = j; // Reset regex position
      }

      return result;
    };

    return addDegToTrig(expr);
  }

  // Set display to value
  setValue(val) {
    this.state.display = val;
    this.updateDisplay();
  }

  // Clear display
  clearScreen() {
    this.state.display = "";
    this.updateDisplay();
  }

  // Clear all (reset calculator)
  clearHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    this.state.display = "0";
    this.state.result = null;
    this.state.lastAction = null;
    this.updateDisplay();
  }

  // Backspace (erase last character)
  backspaceHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    if (this.state.display.length <= 1 || this.state.display === "0") {
      this.state.display = "0";
    } else {
      this.state.display = this.state.display.slice(0, -1);
    }
    this.updateDisplay();
  }

  // Utility: Check if multiplication should be added before new input
  shouldAddMultiplication() {
    const display = this.state.display;
    const lastChar = this.getLastChar();

    // Add multiplication if:
    // 1. Display ends with a digit (not "0")
    // 2. Display ends with closing parenthesis
    // 3. Display ends with "pi"
    return (
      (/\d$/.test(display) && display !== "0") ||
      lastChar === ")" ||
      display.endsWith("pi") ||
      display.endsWith("e")
    );
  }

  // Utility: Add multiplication if needed
  addMultiplicationIfNeeded() {
    if (this.shouldAddMultiplication()) {
      this.state.display += "*";
    }
  }

  // Handle digit button click
  digitHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const digit = e.target.innerText.trim();
    const lastChar = this.getLastChar();
    const display = this.state.display;

    // Check if display ends with 'pi' and add multiplication
    if (display.endsWith("pi")) {
      this.state.display += "*";
    }

    if (
      this.state.lastAction === "eval" &&
      !this.operators.includes(lastChar)
    ) {
      this.state.display = digit;
    } else if (this.state.display === "0") {
      this.state.display = digit;
    } else {
      this.state.display += digit;
    }
    this.state.lastAction = "digit";
    this.state.result = null;
    this.updateDisplay();
  }

  // Handle operator button click
  operatorHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const currentOp = e.target.dataset.func || e.target.innerText.trim();
    const expression = this.state.display;
    const lastChar = this.getLastChar();
    const secondLastChar = this.getSecondLastChar();
    // If last action was evaluation, allow operator chaining
    if (this.state.lastAction === "eval") {
      this.state.result = null;
    }
    if (this.operators.includes(lastChar)) {
      // Only allow '-' after another operator for negative numbers
      if (currentOp === "-" && lastChar !== "-") {
        this.state.display += currentOp;
      } else {
        // If last two are operator + '-', replace both
        if (this.operators.includes(secondLastChar) && lastChar === "-") {
          this.state.display = expression.slice(0, -2) + currentOp;
        } else {
          // Replace last operator with new one
          this.state.display = expression.slice(0, -1) + currentOp;
        }
      }
    } else {
      this.state.display += currentOp;
    }
    this.state.lastAction = "operator";
    this.updateDisplay();
  }

  // Handle decimal button click
  decimalHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const currentNumber = this.getCurrentNumber();
    if (currentNumber.includes(".")) {
      return;
    }
    if (currentNumber === "") {
      this.state.display += "0.";
    } else {
      this.state.display += ".";
    }
    this.updateDisplay();
  }

  // Trigonometry and logarithmic function handler
  trigHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const func = e.target.dataset.func || e.target.innerText.trim();
    const display = this.state.display;

    this.addMultiplicationIfNeeded();

    if (display == "0") {
      this.clearScreen();
    }
    this.state.display += func + "(";
    this.openParens++;
    this.updateDisplay();
  }

  // Override/extend closing parenthesis handler
  closeParenHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    if (this.openParens > 0) {
      this.state.display += ")";
      this.openParens--;
      this.updateDisplay();
    } else {
      alert("Closing Bracket not allowd without opening bracket ");
    }
  }

  // Opening bracket handler
  openBracketHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const display = this.state.display;

    this.addMultiplicationIfNeeded();

    if (display == "0") {
      this.clearScreen();
    }
    this.state.display += "(";
    this.openParens++;
    this.updateDisplay();
  }

  // Handle evaluation (equals) button click
  evaluateHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    let expression = this.state.display;
    if (this.operators.includes(expression.slice(-1))) {
      expression = expression.slice(0, -1);
    }
    // Auto-close any remaining open parentheses
    if (this.openParens > 0) {
      expression += ")".repeat(this.openParens);
      this.openParens = 0;
    }

    try {
      // Evaluate the expression safely
      console.log(this.addAngleMode(expression));
      const result = math.evaluate(this.addAngleMode(expression));

      // Edge case: division by zero, NaN, Infinity, or not finite
      if (typeof result !== "number" || !isFinite(result) || isNaN(result)) {
        throw new Error("Invalid calculation");
      }

      this.state.display = result.toString();
      this.state.result = result;
      this.state.lastAction = "eval";
      this.updateDisplay();

      this.history.push({
        expression,
        result,
      });

      this.renderHistory(expression, result);
    } catch (err) {
      this.frozen = true;
      this.state.display = "Error";
      this.updateDisplay();

      setTimeout(() => {
        this.state.display = "0";
        this.frozen = false;
        this.updateDisplay();
      }, 1500);
    }
  }

  // Pi constant handler
  piHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const display = this.state.display;

    this.addMultiplicationIfNeeded();

    if (display == "0") {
      this.clearScreen();
    }
    this.state.display += "pi";
    this.updateDisplay();
  }

  eHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const display = this.state.display;

    this.addMultiplicationIfNeeded();

    if (display == "0") {
      this.clearScreen();
    }
    this.state.display += "e";
    this.updateDisplay();
  }

  // Function handler for square, reciprocal, sqrt, tenPower
  functionHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    const funcType = e.target.id; // 'square', 'reciprocal', 'sqrt', 'tenPower'
    let expression = this.state.display;

    // Remove trailing operator if present
    if (this.operators.includes(expression.slice(-1))) {
      expression = expression.slice(0, -1);
    }

    try {
      // Evaluate current expression first
      let result = math.evaluate(expression);

      // Apply the specific function to the result
      switch (funcType) {
        case "square":
          result = math.pow(result, 2);
          break;
        case "reciprocal":
          if (result === 0) throw new Error("Division by zero");
          result = 1 / result;
          break;
        case "sqrt":
          if (result < 0) throw new Error("Invalid input for square root");
          result = math.sqrt(result);
          break;
        case "tenPower":
          result = math.pow(10, result);
          break;
        case "floor":
          result = math.floor(result);
          break;
        case "ceil":
          result = math.ceil(result);
          break;
        case "abs":
          result = math.abs(result);
          break;
        default:
          throw new Error("Unknown function");
      }

      // Check for invalid results
      if (typeof result !== "number" || !isFinite(result) || isNaN(result)) {
        throw new Error("Invalid calculation");
      }

      this.state.display = result.toString();
      this.state.result = result;
      this.state.lastAction = "eval";
      this.updateDisplay();
    } catch (err) {
      this.frozen = true;
      this.state.display = "Error";
      this.updateDisplay();
      setTimeout(() => {
        this.state.display = "0";
        this.frozen = false;
        this.updateDisplay();
      }, 1500);
    }
  }

  // Factorial handler - evaluates expression then calculates factorial
  factorialHandler(e) {
    if (this.frozen) return;
    e.preventDefault();
    let expression = this.state.display;

    // Remove trailing operator if present
    if (this.operators.includes(expression.slice(-1))) {
      expression = expression.slice(0, -1);
    }

    try {
      // Evaluate current expression first
      let result = math.evaluate(expression);

      // Calculate factorial
      if (result < 0 || !Number.isInteger(result)) {
        throw new Error("Invalid input for factorial");
      }
      result = math.factorial(result);

      // Check for invalid results
      if (typeof result !== "number" || !isFinite(result) || isNaN(result)) {
        throw new Error("Invalid calculation");
      }

      this.state.display = result.toString();
      this.state.result = result;
      this.state.lastAction = "eval";
      this.updateDisplay();
    } catch (err) {
      this.frozen = true;
      this.state.display = "Error";
      this.updateDisplay();
      setTimeout(() => {
        this.state.display = "0";
        this.frozen = false;
        this.updateDisplay();
      }, 1500);
    }
  }

  toggleAngle(e) {
    e.preventDefault();
    if (this.angleMode == "deg") {
      e.target.innerText = "RAD";
      this.angleMode = "rad";
      return;
    }
    e.target.innerText = "DEG";
    this.angleMode = "deg";
  }

  randomNumberHandler(e) {
    e.preventDefault();
    const num = Math.random();

    const display = this.state.display;
    this.addMultiplicationIfNeeded();

    if (display == "0") {
      this.clearScreen();
    }
    this.state.lastAction = "eval";
    this.state.display += num;
    this.updateDisplay();
  }

  renderHistory(expr, result) {
    const entry = document.createElement("li");
    entry.textContent = `${expr} = ${result}`;
    historyList.prepend(entry);

    if (historyList.children.length > 20) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  memoryDisplay() {
    this.memoryElement.innerText = this.memory;
  }

  memoryStore(e) {
    e.preventDefault();

    //Evalute If there is an Expression than store it
    this.evaluateHandler(e);

    // Gaurd to Protect from adding Error ro MEmory
    if (this.frozen) return;

    //now take the value From display and store it
    //Clear The Screen And update memory Display
    this.memory = this.state.display;
    this.memoryDisplay();
    this.state.display = "0";
    this.state.result = null;
    this.state.lastAction = "operator";
    this.updateDisplay(e);
  }

  memoryClear(e) {
    e.preventDefault();
    this.memory = "0";
    this.memoryDisplay();
  }

  memoryAdd(e) {
    e.preventDefault();
    //Evalute Expression
    if (this.memory == "0") return;
    this.evaluateHandler(e);

    //Check if error than Do Nothing
    if (this.frozen) return;
    //If Executed Than add Memory Value and re execute
    this.state.display = this.state.display + `+${this.memory}`;
    this.evaluateHandler(e);
  }

  memorySub(e) {
    e.preventDefault();

    //Evalute Expression
    if (this.memory == "0") return;
    this.evaluateHandler(e);

    //Check if error than Do Nothing
    if (this.frozen) return;

    //If Executed Than add Memory Value and re execute
    this.state.display = this.state.display + `-${this.memory}`;
    this.evaluateHandler(e);
  }

  memoryRecall(e) {
    e.preventDefault();
    if (this.frozen || this.memory == "0") return;

    //Check if it is 0 than replace and return
    if (this.state.display == "0" || this.state.display == this.memory) {
      this.state.display = this.memory;
      this.updateDisplay(e);
      return;
    }

    //Now Check if last Char is Number than add it to Multiplcation else Direct
    this.addMultiplicationIfNeeded(e);
    this.state.display = this.state.display + this.memory;
    this.updateDisplay(e);
  }

  // Register all event handlers
  init() {
    // Group handlers by type for better organization
    const handlerGroups = {
      // Class-based selectors
      classHandlers: [
        { selector: ".digit", handler: this.digitHandler },
        { selector: ".operator", handler: this.operatorHandler },
        { selector: ".funcHandle", handler: this.trigHandler },
      ],

      // Single button handlers
      singleHandlers: [
        { id: "dot", handler: this.decimalHandler },
        { id: "equals", handler: this.evaluateHandler },
        { id: "clear", handler: this.clearHandler },
        { id: "backspace", handler: this.backspaceHandler },
        { id: "close-paren", handler: this.closeParenHandler },
        { id: "open-bracket", handler: this.openBracketHandler },
        { id: "pi", handler: this.piHandler },
        { id: "exp", handler: this.eHandler },
        { id: "factorial", handler: this.factorialHandler },
        { id: "toggleAngleMode", handler: this.toggleAngle },
        { id: "randButton", handler: this.randomNumberHandler },
        { id: "ms", handler: this.memoryStore },
        { id: "mc", handler: this.memoryClear },
        { id: "mr", handler: this.memoryRecall },
        { id: "mplus", handler: this.memoryAdd },
        { id: "minus", handler: this.memorySub },
      ],

      // Function buttons that evaluate expressions
      functionHandlers: [
        "square",
        "reciprocal",
        "sqrt",
        "tenPower",
        "floor",
        "abs",
        "ceil",
      ],
    };

    // Bind class-based handlers
    handlerGroups.classHandlers.forEach(({ selector, handler }) => {
      document.querySelectorAll(selector).forEach((btn) => {
        btn.addEventListener("click", handler.bind(this));
      });
    });

    // Bind single button handlers
    handlerGroups.singleHandlers.forEach(({ id, handler }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("click", handler.bind(this));
      } else {
        console.warn(`Element with id '${id}' not found`);
      }
    });

    // Bind function handlers
    handlerGroups.functionHandlers.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("click", this.functionHandler.bind(this));
      } else {
        console.warn(`Element with id '${id}' not found`);
      }
    });
  }
}

// Instantiate calculator
const calculator = new Calculator();
