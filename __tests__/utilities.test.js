// Pruebas de utilidades y helpers
const {
    capitalize,
    chunk,
    countWords,
    debounce,
    deepClone,
    factorial,
    fibonacci,
    formatCurrency,
    generateId,
    isPalindrome,
    isPrime,
    isValidEmail,
    reverseString,
    shuffle,
    truncate,
    unique
} = require('./utils');

describe('Pruebas de funciones de utilidad', () => {
  test('validar email correcto', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user@domain.co')).toBe(true);
  });

  test('validar email incorrecto', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  test('capitalizar string', () => {
    expect(capitalize('hola')).toBe('Hola');
    expect(capitalize('HOLA')).toBe('Hola');
    expect(capitalize('TeSt')).toBe('Test');
  });

  test('invertir string', () => {
    expect(reverseString('hola')).toBe('aloh');
    expect(reverseString('123')).toBe('321');
  });

  test('verificar palíndromo', () => {
    expect(isPalindrome('ana')).toBe(true);
    expect(isPalindrome('racecar')).toBe(true);
    expect(isPalindrome('A man a plan a canal Panama')).toBe(true);
    expect(isPalindrome('hello')).toBe(false);
  });

  test('contar palabras', () => {
    expect(countWords('hola mundo')).toBe(2);
    expect(countWords('  hola   mundo  ')).toBe(2);
    expect(countWords('')).toBe(0);
  });

  test('obtener valores únicos', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    expect(unique(['a', 'a', 'b'])).toEqual(['a', 'b']);
  });

  test('shuffle array mantiene elementos', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled).toHaveLength(5);
    expect(shuffled).toEqual(expect.arrayContaining(arr));
  });

  test('deep clone de objeto', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  test('calcular factorial', () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(5)).toBe(120);
    expect(factorial(10)).toBe(3628800);
  });

  test('calcular Fibonacci', () => {
    expect(fibonacci(0)).toBe(0);
    expect(fibonacci(1)).toBe(1);
    expect(fibonacci(5)).toBe(5);
    expect(fibonacci(10)).toBe(55);
  });

  test('verificar número primo', () => {
    expect(isPrime(2)).toBe(true);
    expect(isPrime(3)).toBe(true);
    expect(isPrime(5)).toBe(true);
    expect(isPrime(7)).toBe(true);
    expect(isPrime(4)).toBe(false);
    expect(isPrime(9)).toBe(false);
    expect(isPrime(1)).toBe(false);
  });

  test('formatear moneda', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(100, 'EUR')).toBe('€100.00');
  });

  test('truncar texto', () => {
    expect(truncate('Hola Mundo', 5)).toBe('Hola ...');
    expect(truncate('Hola', 10)).toBe('Hola');
  });

  test('generar ID único', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });

  test('chunk array', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  test('debounce función', (done) => {
    let called = false;
    const debouncedFn = debounce(() => {
      called = true;
    }, 100);

    debouncedFn();
    expect(called).toBe(false);

    setTimeout(() => {
      expect(called).toBe(true);
      done();
    }, 150);
  });
});

describe('Pruebas de validación de datos', () => {
  test('validar que no sea null', () => {
    const value = 'test';
    expect(value).not.toBeNull();
  });

  test('validar que sea definido', () => {
    const value = 'test';
    expect(value).toBeDefined();
  });

  test('validar tipo de dato', () => {
    expect(typeof 'test').toBe('string');
    expect(typeof 123).toBe('number');
    expect(typeof true).toBe('boolean');
    expect(typeof {}).toBe('object');
    expect(typeof []).toBe('object');
  });

  test('validar instancia de', () => {
    expect([]).toBeInstanceOf(Array);
    expect({}).toBeInstanceOf(Object);
    expect(new Date()).toBeInstanceOf(Date);
  });
});

describe('Pruebas de estructuras de datos', () => {
  test('Map básico', () => {
    const map = new Map();
    map.set('key1', 'value1');
    map.set('key2', 'value2');
    expect(map.get('key1')).toBe('value1');
    expect(map.has('key2')).toBe(true);
    expect(map.size).toBe(2);
  });

  test('Set básico', () => {
    const set = new Set();
    set.add(1);
    set.add(2);
    set.add(1); // duplicado
    expect(set.size).toBe(2);
    expect(set.has(1)).toBe(true);
  });

  test('WeakMap básico', () => {
    const obj = {};
    const weakMap = new WeakMap();
    weakMap.set(obj, 'value');
    expect(weakMap.get(obj)).toBe('value');
  });
});
