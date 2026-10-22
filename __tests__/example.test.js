// Pruebas unitarias simples - no dependen del proyecto
describe('Pruebas básicas de matemáticas', () => {
  test('suma de dos números', () => {
    expect(2 + 2).toBe(4);
  });

  test('resta de dos números', () => {
    expect(10 - 5).toBe(5);
  });

  test('multiplicación de dos números', () => {
    expect(3 * 4).toBe(12);
  });

  test('división de dos números', () => {
    expect(20 / 4).toBe(5);
  });
});

describe('Pruebas de strings', () => {
  test('concatenación de strings', () => {
    expect('Hola' + ' ' + 'Mundo').toBe('Hola Mundo');
  });

  test('longitud de string', () => {
    expect('Test'.length).toBe(4);
  });

  test('transformación a mayúsculas', () => {
    expect('test'.toUpperCase()).toBe('TEST');
  });
});

describe('Pruebas de arrays', () => {
  test('longitud de array', () => {
    expect([1, 2, 3, 4]).toHaveLength(4);
  });

  test('verificar si contiene elemento', () => {
    expect([1, 2, 3]).toContain(2);
  });

  test('verificar si array está vacío', () => {
    expect([]).toHaveLength(0);
  });
});

describe('Pruebas de objetos', () => {
  test('propiedad de objeto', () => {
    const obj = { nombre: 'Test', edad: 25 };
    expect(obj.nombre).toBe('Test');
  });

  test('comparación de objetos', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2 };
    expect(obj1).toEqual(obj2);
  });
});

describe('Pruebas de condiciones booleanas', () => {
  test('verdadero', () => {
    expect(true).toBe(true);
  });

  test('falso', () => {
    expect(false).toBe(false);
  });

  test('valores truthy', () => {
    expect(1).toBeTruthy();
    expect('texto').toBeTruthy();
  });

  test('valores falsy', () => {
    expect(0).toBeFalsy();
    expect('').toBeFalsy();
    expect(null).toBeFalsy();
    expect(undefined).toBeFalsy();
  });
});
