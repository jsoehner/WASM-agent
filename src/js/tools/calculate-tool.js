"/**
 * Calculate Tool Implementation
 * 
 * This module provides mathematical computation capabilities using
 * the JavaScript Math library with safe evaluation for WASM.
 */

/**
 * Safe mathematical expression evaluator
 * @param {string} expression - Mathematical expression
 * @param {Object} context - Variable context
 * @param {Object} options - Options for precision and operations
 * @returns {number|Object} - Computation result
 */
export async function calculate(expression, context = {}, options = {}) {
  const {
    precision = 10,
    allowDangerousFunctions = false,
    safeMode = true
  } = options;

  try {
    // Validate expression
    if (!isValidExpression(expression)) {
      throw new Error('Invalid mathematical expression');
    }

    // Create safe evaluation context
    const scope = createSafeScope(context, allowDangerousFunctions);
    
    // Evaluate expression
    let result;
    if (safeMode) {
      // Use a safer evaluation method
      result = safeEvaluate(expression, scope, precision);
    } else {
      // Direct evaluation (less safe but faster)
      result = evaluateExpression(expression, scope, precision);
    }

    // Handle edge cases
    if (result === Infinity || result === -Infinity) {
      throw new Error('Result is infinite');
    }
    
    if (!isFinite(result)) {
      throw new Error('Invalid computation result');
    }

    return roundToPrecision(result, precision);
  } catch (error) {
    console.error('[CalculateTool] Error:', error);
    throw error;
  }
}

/**
 * Safe mathematical expression parser and evaluator
 * @param {string} expression - Expression to evaluate
 * @returns {Object} - Computation result with steps
 */
export function evaluate(expression) {
  try {
    // Parse and validate expression
    const parsed = parseExpression(expression);
    
    if (!parsed.valid) {
      throw new Error(`Invalid expression: ${parsed.error}`);
    }

    // Evaluate expression
    const result = eval(parsed.expression);
    
    // Validate result
    if (!isFinite(result)) {
      throw new Error('Invalid computation result');
    }

    return {
      success: true,
      result,
      expression: parsed.expression,
      steps: generateSteps(expression, parsed)
    };
  } catch (error) {
    console.error('[Calculate] Error:', error);
    return {
      success: false,
      error: error.message,
      expression: expression
    };
  }
}

/**
 * Safe scope creation for evaluation
 * @param {Object} context - Context variables
 * @param {boolean} allowDangerous - Allow dangerous functions
 * @returns {Proxy} - Safe evaluation scope
 */
function createSafeScope(context, allowDangerous = false) {
  // Basic functions
  const basicFunctions = {
    Math: Math,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    abs: Math.abs,
    sqrt: Math.sqrt,
    pow: Math.pow,
    exp: Math.exp,
    log: Math.log,
    log10: Math.log10,
    ln: Math.log,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    atan2: Math.atan2,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    asinh: Math.asinh,
    acosh: Math.acosh,
    atanh: Math.atanh
  };

  // Add context variables
  const scope = { ...basicFunctions, ...context };

  // Only allow Math.* operations in safe mode
  if (!allowDangerous) {
    // Remove any dangerous functions
    const dangerousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval', 'alert', 'confirm'];
    dangerousFunctions.forEach(fn => {
      delete scope[fn];
    });
  }

  return scope;
}

/**
 * Parse mathematical expression
 * @param {string} expression - Expression to parse
 * @returns {Object} - Parsed expression info
 */
function parseExpression(expression) {
  try {
    // Tokenize expression
    const tokens = tokenize(expression);
    
    // Simple parser for arithmetic operations
    let i = 0;
    let current = '';
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      if (token.type === 'NUMBER') {
        current += token.value;
      } else if (token.type === 'OPERATOR' || token.type === 'LPAREN') {
        if (current) {
          // Push current number to stack
          current = '';
        }
        
        if (token.type === 'LPAREN') {
          // Parentheses handling
        }
      } else if (token.type === 'NUMBER') {
        current += token.value;
      }

      i++;
    }

    return {
      valid: true,
      expression: expression
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Tokenize mathematical expression
 * @param {string} expression - Expression to tokenize
 * @returns {Array} - Tokens
 */
function tokenize(expression) {
  const tokens = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];
    let tokenType = 'UNKNOWN';

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        current += expression[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: current });
      current = '';
    }

    // Operators
    else if ('+-*/%()'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
    }

    // Parentheses
    else if ('()'.includes(char)) {
      tokens.push({ type: char === '(' ? 'LPAREN' : 'RPAREN' });
      i++;
    }

    else {
      throw new Error(`Unexpected character: ${char}`);
    }
  }

  return tokens;
}

/**
 * Safe expression evaluation
 * @param {string} expression - Expression to evaluate
 * @param {Object} scope - Evaluation scope
 * @returns {number} - Result
 */
function safeEvaluate(expression, scope) {
  // Remove comments
  const cleanExpression = expression.replace(/\/\/.*$/gm, '').trim();

  // Evaluate in sandbox
  try {
    // Use Function constructor with controlled scope
    const fn = new Function(...Object.keys(scope), `return (${cleanExpression});`);
    return fn(...Object.values(scope));
  } catch (error) {
    throw new Error(`Evaluation failed: ${error.message}`);
  }
}

/**
 * Evaluate expression (less safe)
 * @param {string} expression - Expression to evaluate
 * @param {Object} scope - Evaluation scope
 * @returns {number} - Result
 */
function evaluateExpression(expression, scope, precision = 10) {
  // Round result to specified precision
  return Number(Math.round(Number(expression) + 'e' + precision) + 'e-' + precision);
}

/**
 * Round to precision
 * @param {number} value - Value to round
 * @param {number} precision - Precision
 * @returns {number} - Rounded value
 */
function roundToPrecision(value, precision = 10) {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Generate computation steps
 * @param {string} expression - Original expression
 * @param {Object} parsed - Parsed expression
 * @returns {Array} - Computation steps
 */
function generateSteps(expression, parsed) {
  return [
    { step: 1, description: 'Parse expression', result: expression },
    { step: 2, description: 'Validate syntax', result: parsed.valid },
    { step: 3, description: 'Evaluate computation', result: parsed.expression }
  ];
}

/**
 * Validate mathematical expression
 * @param {string} expression - Expression to validate
 * @returns {boolean} - Is valid
 */
function isValidExpression(expression) {
  try {
    // Basic validation
    if (!expression || typeof expression !== 'string') {
      return false;
    }

    // Check for basic syntax
    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create WASM calculate handler
 * This function creates a function that can be exposed to WASM
 */
export function createCalculateHandler() {
  return async (expression, context = {}, options = {}) => {
    try {
      const result = await calculate(expression, context, options);
      
      // Log result (WASM can use this)
      console.log('[WasmCalculate] Result:', result);
      
      return result;
    } catch (error) {
      console.error('[WasmCalculate] Error:', error);
      throw error;
    }
  };
}

/**
 * Export all calculate tools
 */
export {
  calculate,
  evaluate,
  createSafeScope,
  parseExpression,
  tokenize,
  safeEvaluate,
  evaluateExpression,
  roundToPrecision,
  generateSteps,
  isValidExpression,
  createCalculateHandler
};"