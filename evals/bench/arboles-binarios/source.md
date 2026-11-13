# Árboles Binarios de Búsqueda: Inserción, Medidas, Balance y Tipos

## Propósito

Aprenderás cómo se construye un árbol binario de búsqueda (ABB) insertando valores uno por uno, y cómo describir su forma con medidas precisas: nivel, altura, longitud de camino y factor de equilibrio. También aprenderás a reconocer por su estructura si un árbol es lleno, completo, perfecto o degenerado, y a escribir funciones recursivas en Python que calculen cada medida.

## Objetivos de aprendizaje

Al finalizar, el estudiante podrá:

- Insertar valores en un ABB comparando desde la raíz y bajando a la izquierda o a la derecha.
- Explicar por qué un valor nuevo siempre queda como hoja y por qué un valor repetido se rechaza.
- Predecir cómo cambia la forma del árbol según el orden de inserción.
- Calcular el nivel de un nodo, la altura del árbol y la longitud de camino interno.
- Calcular el factor de equilibrio de cada nodo y decidir si un árbol está balanceado.
- Clasificar un árbol como lleno, completo, perfecto o degenerado.
- Implementar en Python la clase `Nodo` y las funciones recursivas `insertar`, `altura` y `nivel`.

## Contexto

Un ABB organiza datos para encontrarlos rápido. En cada nodo, todo lo que está a su izquierda es menor y todo lo que está a su derecha es mayor. Esa regla convierte cada comparación en una decisión: ir a la izquierda o ir a la derecha. Si el árbol queda bien repartido, se descarta casi la mitad de los datos en cada paso; si queda torcido, se parece a una lista y pierde esa ventaja.

## Conceptos clave

### Árbol binario de búsqueda (ABB)

**Definición:** árbol en el que cada nodo tiene como máximo dos hijos y, para cada nodo, los valores del subárbol izquierdo son menores y los del subárbol derecho son mayores.

**Regla principal:** en esta práctica no se admiten valores repetidos; si un valor ya existe, la inserción se rechaza y el árbol no cambia.

### Raíz, hoja y subárbol

**Raíz:** primer nodo del árbol; es el primer valor que se insertó.

**Hoja:** nodo sin hijos.

**Subárbol:** un nodo junto con todos sus descendientes.

### Nivel y altura

**Nivel de un nodo:** cantidad de aristas desde la raíz hasta ese nodo. La raíz está en el nivel 0.

**Altura del árbol:** nivel de la hoja más profunda. Un árbol con un solo nodo tiene altura 0 y un árbol vacío tiene altura −1.

### Longitud de camino

**Longitud de camino de un nodo:** número de aristas que se recorren desde la raíz hasta ese nodo. Con la convención de esta práctica coincide con su nivel.

**Longitud de camino interno (LCI):** suma de las longitudes de camino de todos los nodos del árbol.

**Longitud de camino media:** LCI dividida entre la cantidad de nodos.

### Factor de equilibrio

**Definición:** `FE = altura(izq) - altura(der)`, calculado en cada nodo con las alturas de sus dos subárboles.

**Árbol balanceado:** aquel en el que todos los nodos cumplen `|FE| <= 1`.

### Tipos de árbol según su forma

- **Lleno (estricto):** cada nodo tiene 0 o 2 hijos.
- **Completo:** todos los niveles están llenos excepto quizá el último, que se llena de izquierda a derecha.
- **Perfecto:** todos los nodos internos tienen 2 hijos y todas las hojas están en el mismo nivel.
- **Degenerado:** cada nodo tiene como máximo un hijo; el árbol parece una lista.

Un árbol puede cumplir varios tipos a la vez o ninguno. Todo árbol perfecto también es lleno y completo.

## Explicación paso a paso

### Paso 1: comparar desde la raíz

Para insertar un valor `x`, empieza en la raíz y compara:

- Si `x` es menor que el valor del nodo, baja al hijo izquierdo.
- Si `x` es mayor, baja al hijo derecho.
- Si `x` es igual, el valor ya existe y la inserción se rechaza.

### Paso 2: llegar a un hueco vacío

Repite la comparación en cada nodo del camino. Cuando el hijo hacia el que debes bajar no existe, ese hueco vacío es el lugar del nuevo valor. El valor queda como hoja y ningún nodo existente cambia de lugar.

### Paso 3: el orden de inserción define la forma

Los mismos valores producen árboles distintos según el orden en que llegan. Si se insertan valores ya ordenados, por ejemplo 10, 20, 30, 40, cada uno baja siempre por la derecha y el árbol queda degenerado. Si primero entra un valor central, el árbol se reparte mejor y su altura es menor.

### Paso 4: medir el árbol

- Para el **nivel** de un nodo, cuenta las aristas desde la raíz.
- Para la **altura**, busca la hoja más profunda.
- Para la **LCI**, escribe el nivel de cada nodo y súmalos.

### Paso 5: calcular el factor de equilibrio

En cada nodo, calcula la altura del subárbol izquierdo y la del derecho. Recuerda que un subárbol vacío tiene altura −1. Resta izquierda menos derecha. Si algún nodo da un valor mayor que 1 o menor que −1, el árbol no está balanceado.

### Paso 6: clasificar la forma

Cuenta los hijos de cada nodo:

- Si ningún nodo tiene exactamente un hijo, el árbol es lleno.
- Si ningún nodo tiene dos hijos, el árbol es degenerado.
- Para completo, revisa nivel por nivel de izquierda a derecha: no debe aparecer un nodo después de un hueco.
- Un árbol perfecto de altura `h` tiene exactamente `2 ** (h + 1) - 1` nodos.

## Ejemplo guiado

Inserta en un ABB vacío los valores 8, 3, 10 y 6, en ese orden.

1. El 8 llega a un árbol vacío y se convierte en la raíz.
2. El 3 es menor que 8, baja a la izquierda y queda como hoja.
3. El 10 es mayor que 8, baja a la derecha y queda como hoja.
4. El 6 es menor que 8 y va a la izquierda; luego es mayor que 3 y va a la derecha de 3, donde queda como hoja.

```text
        8
       / \
      3   10
       \
        6
```

Medidas de este árbol:

- Niveles: 8 en el nivel 0; 3 y 10 en el nivel 1; 6 en el nivel 2.
- Altura del árbol: 2.
- LCI: 0 + 1 + 1 + 2 = 4, y la longitud de camino media es 4 / 4 = 1.0.
- Factor de equilibrio: FE(8) = 1 − 0 = 1; FE(3) = −1 − 0 = −1; FE(10) = 0; FE(6) = 0. Todos cumplen `|FE| <= 1`, así que está balanceado.
- Tipo: no es lleno porque el 3 tiene un solo hijo; no es completo porque en el nivel 2 el 6 aparece después de un hueco; no es perfecto ni degenerado.

## Código base en Python

Cada nodo guarda su valor y referencias a sus dos hijos.

```python
class Nodo:
    def __init__(self, valor):
        self.valor = valor
        self.izq = None
        self.der = None
```

La inserción recursiva devuelve la raíz del subárbol en cada llamada. Si el valor es igual al del nodo, no entra en ninguna rama y el árbol queda igual.

```python
def insertar(nodo, valor):
    if nodo is None:
        return Nodo(valor)
    if valor < nodo.valor:
        nodo.izq = insertar(nodo.izq, valor)
    elif valor > nodo.valor:
        nodo.der = insertar(nodo.der, valor)
    return nodo
```

La altura usa la convención de árbol vacío igual a −1.

```python
def altura(nodo):
    if nodo is None:
        return -1
    izq = altura(nodo.izq)
    der = altura(nodo.der)
    return 1 + max(izq, der)
```

## Errores frecuentes

- **Mover nodos al insertar.** Un valor nuevo nunca desplaza a otro: siempre ocupa un hueco vacío como hoja.
- **Insertar duplicados.** Si el valor es igual al de un nodo, la inserción se rechaza.
- **Olvidar el `return` en `insertar`.** Sin devolver el nodo, el enlace del padre se pierde y el árbol queda roto.
- **Empezar los niveles en 1.** En esta práctica la raíz está en el nivel 0.
- **Usar 0 como altura de un subárbol vacío.** Un subárbol vacío mide −1; una hoja mide 0.
- **Restar al revés en el factor de equilibrio.** Es altura izquierda menos altura derecha.
- **Creer que completo y lleno son lo mismo.** Un árbol puede ser completo sin ser lleno, y lleno sin ser completo.

## Pistas progresivas

**Pista 1 (inserción):** antes de dibujar, escribe el camino de comparaciones de cada valor, por ejemplo `6 < 8 → izquierda · 6 > 3 → derecha`.

**Pista 2 (orden):** el primer valor de la secuencia siempre es la raíz; un nodo solo puede aparecer después de todos los nodos de su camino.

**Pista 3 (medidas):** dibuja franjas horizontales por nivel; el nivel de cada nodo es su franja y la altura es la franja más baja que tiene nodos.

**Pista 4 (balance):** calcula las alturas desde las hojas hacia arriba; así cada factor de equilibrio usa valores ya conocidos.

**Pista 5 (tipos):** anota cuántos hijos tiene cada nodo; esa cuenta decide si es lleno o degenerado.

## Práctica guiada

Resuelve los ejercicios en papel y luego en Python. Prueba cada función con el árbol del ejemplo y con al menos dos casos propios.

1. **Construir el árbol a mano.** Inserta una secuencia de valores en un ABB vacío, dibuja el árbol después de cada inserción y escribe el camino de comparaciones de cada valor. Después intenta insertar un valor repetido y explica qué ocurre.
2. **El orden importa.** Inserta los mismos valores en orden creciente y en un orden que empiece por el valor central. Compara la altura de ambos árboles y la cantidad de comparaciones necesarias para insertar un valor nuevo.
3. **Clase Nodo e inserción.** Usa la clase `Nodo` e implementa `insertar` y `inorden`, que imprime los valores recorriendo izquierda, nodo y derecha.
4. **Niveles y altura.** Indica el nivel de cada nodo e implementa `altura(nodo)` y `nivel(nodo, valor)`, que devuelve −1 si el valor no está.
5. **Longitud de camino.** Calcula la longitud de camino de varios nodos, la LCI y la longitud media, e implementa `longitud_camino(nodo, valor)` y `lci(nodo)`.
6. **Factor de equilibrio.** Calcula el FE de cada nodo, decide si el árbol está balanceado e implementa `factor_equilibrio(nodo)` y `esta_balanceado(nodo)`.
7. **Identificar el tipo.** Para varios árboles dibujados, indica todos los tipos que cumple cada uno y justifica tu respuesta.
8. **Clasificar con código.** Implementa `contar_nodos`, `es_lleno`, `es_degenerado` y `es_perfecto`. Como reto opcional, implementa `es_completo` recorriendo el árbol por niveles con una cola.

## Resumen

- En un ABB, los menores van a la izquierda y los mayores a la derecha de cada nodo.
- Insertar es comparar desde la raíz hasta un hueco vacío; el valor nuevo queda como hoja.
- Un valor repetido se rechaza y el árbol no cambia.
- El orden de inserción define la forma: valores ordenados producen un árbol degenerado.
- El nivel cuenta aristas desde la raíz; la altura es el nivel más profundo; la LCI suma todas las longitudes de camino.
- `FE = altura(izq) - altura(der)`; el árbol está balanceado si todos sus nodos cumplen `|FE| <= 1`.
- Lleno, completo, perfecto y degenerado describen la forma; un árbol puede cumplir varios o ninguno.

## Glosario

- **ABB:** árbol binario de búsqueda; menores a la izquierda y mayores a la derecha de cada nodo.
- **Nodo:** elemento del árbol que guarda un valor y referencias a sus hijos.
- **Raíz:** nodo superior del árbol; el primer valor insertado.
- **Hoja:** nodo sin hijos.
- **Arista:** enlace entre un nodo y uno de sus hijos.
- **Nivel:** aristas desde la raíz hasta el nodo; la raíz está en el nivel 0.
- **Altura:** nivel de la hoja más profunda; árbol vacío −1.
- **Longitud de camino:** aristas recorridas desde la raíz hasta un nodo.
- **Longitud de camino interno (LCI):** suma de las longitudes de camino de todos los nodos.
- **Factor de equilibrio (FE):** altura del subárbol izquierdo menos altura del subárbol derecho.
- **Árbol balanceado:** árbol donde todos los nodos cumplen `|FE| <= 1`.
- **Árbol lleno:** cada nodo tiene 0 o 2 hijos.
- **Árbol completo:** niveles llenos salvo el último, que se llena de izquierda a derecha.
- **Árbol perfecto:** nodos internos con 2 hijos y hojas en el mismo nivel.
- **Árbol degenerado:** cada nodo tiene como máximo un hijo.
