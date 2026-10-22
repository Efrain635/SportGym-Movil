// Pruebas avanzadas - casos más complejos

describe('Pruebas de funciones asíncronas', () => {
  test('promesa resuelta', async () => {
    const promise = Promise.resolve(42);
    await expect(promise).resolves.toBe(42);
  });

  test('promesa rechazada', async () => {
    const promise = Promise.reject(new Error('Error de prueba'));
    await expect(promise).rejects.toThrow('Error de prueba');
  });

  test('async/await', async () => {
    const asyncFunction = async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('completado'), 100);
      });
    };
    const result = await asyncFunction();
    expect(result).toBe('completado');
  });
});

describe('Pruebas de manipulación de datos', () => {
  test('filtrar array', () => {
    const numbers = [1, 2, 3, 4, 5, 6];
    const evens = numbers.filter(n => n % 2 === 0);
    expect(evens).toEqual([2, 4, 6]);
  });

  test('mapear array', () => {
    const numbers = [1, 2, 3];
    const doubled = numbers.map(n => n * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });

  test('reducir array', () => {
    const numbers = [1, 2, 3, 4];
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    expect(sum).toBe(10);
  });

  test('encontrar elemento', () => {
    const users = [
      { id: 1, name: 'Juan' },
      { id: 2, name: 'Maria' },
      { id: 3, name: 'Pedro' }
    ];
    const user = users.find(u => u.id === 2);
    expect(user?.name).toBe('Maria');
  });
});

describe('Pruebas de strings avanzadas', () => {
  test('verificar si string contiene substring', () => {
    expect('Hola Mundo').toContain('Mundo');
  });

  test('verificar si string empieza con', () => {
    expect('Test').toMatch(/^Test/);
  });

  test('verificar si string termina con', () => {
    expect('Test').toMatch(/test$/i);
  });

  test('reemplazar substring', () => {
    const result = 'Hola Mundo'.replace('Mundo', 'Todos');
    expect(result).toBe('Hola Todos');
  });

  test('split string', () => {
    const parts = 'a,b,c'.split(',');
    expect(parts).toEqual(['a', 'b', 'c']);
  });
});

describe('Pruebas de objetos anidados', () => {
  test('objeto con propiedades anidadas', () => {
    const obj = {
      user: {
        profile: {
          name: 'Test',
          age: 25
        }
      }
    };
    expect(obj.user.profile.name).toBe('Test');
  });

  test('verificar propiedad existe', () => {
    const obj = { name: 'Test', age: 25 };
    expect(obj).toHaveProperty('name');
    expect(obj).toHaveProperty('age', 25);
  });

  test('spread operator', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { ...obj1, c: 3 };
    expect(obj2).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe('Pruebas de condiciones lógicas', () => {
  test('operador AND', () => {
    expect(true && true).toBe(true);
    expect(true && false).toBe(false);
  });

  test('operador OR', () => {
    expect(true || false).toBe(true);
    expect(false || false).toBe(false);
  });

  test('operador NOT', () => {
    expect(!true).toBe(false);
    expect(!false).toBe(true);
  });

  test('comparación de valores', () => {
    expect(5).toBeGreaterThan(3);
    expect(5).toBeLessThan(10);
    expect(5).toBeGreaterThanOrEqual(5);
    expect(5).toBeLessThanOrEqual(5);
  });
});

describe('Pruebas de números', () => {
  test('redondeo', () => {
    expect(Math.round(3.7)).toBe(4);
    expect(Math.floor(3.9)).toBe(3);
    expect(Math.ceil(3.1)).toBe(4);
  });

  test('valor absoluto', () => {
    expect(Math.abs(-5)).toBe(5);
    expect(Math.abs(5)).toBe(5);
  });

  test('máximo y mínimo', () => {
    expect(Math.max(1, 2, 3)).toBe(3);
    expect(Math.min(1, 2, 3)).toBe(1);
  });

  test('número aleatorio en rango', () => {
    const random = Math.floor(Math.random() * 10);
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThan(10);
  });
});

describe('Pruebas de fechas', () => {
  test('crear fecha', () => {
    const date = new Date();
    expect(date.getFullYear()).toBeGreaterThan(2020);
    expect(date.getMonth()).toBeGreaterThanOrEqual(0);
    expect(date.getMonth()).toBeLessThanOrEqual(11);
    expect(date.getDate()).toBeGreaterThan(0);
    expect(date.getDate()).toBeLessThanOrEqual(31);
  });

  test('diferencia de fechas', () => {
    const date1 = new Date();
    const date2 = new Date(date1.getTime() + 86400000);
    const diff = date2.getTime() - date1.getTime();
    expect(diff).toBe(86400000); // 1 día en milisegundos
  });
});

describe('Pruebas de edge cases', () => {
  test('array vacío', () => {
    const arr = [];
    expect(arr).toHaveLength(0);
    expect(arr).toEqual([]);
  });

  test('null y undefined', () => {
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
    expect(null).toBeDefined();
  });

  test('NaN', () => {
    expect(NaN).toBeNaN();
  });

  test('valores negativos', () => {
    expect(-5).toBeLessThan(0);
  });
});

describe('Pruebas de clonación', () => {
  test('clonación superficial de array', () => {
    const arr = [1, 2, 3];
    const cloned = [...arr];
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });

  test('clonación superficial de objeto', () => {
    const obj = { a: 1, b: 2 };
    const cloned = { ...obj };
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
  });
});
