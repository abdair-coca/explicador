# ¿Dónde va cada valor en un árbol binario de búsqueda?

<brief form="structure">
<audience>Estudiantes de segundo año de ingeniería que saben qué es una lista enlazada</audience>
<question>¿Dónde va cada valor en un árbol binario de búsqueda, qué forma toma el árbol y cómo se mide?</question>
<example>Insertar 8, 3, 10 y 6, en ese orden, en un árbol vacío</example>
<misconception>Creer que al insertar un valor nuevo se mueven los nodos que ya están en el árbol</misconception>
<check>Predecir dónde queda el 9 si se inserta después, y si el árbol sigue balanceado</check>
<terms>árbol binario de búsqueda (ABB), raíz, hoja, nivel, altura, longitud de camino interno (LCI), factor de equilibrio (FE), árbol lleno, árbol completo, árbol degenerado</terms>
</brief>

<theme name="code" />

Cuatro valores llegan uno a uno a un árbol vacío: **8, 3, 10 y 6**. En cada nodo que pasan, la pregunta es la misma: ¿menor o mayor?

<structure id="crecer" title="Cuatro valores forman un árbol de tres pisos" arc="example" ref="source.md#Ejemplo guiado">
<member id="n8" label="8" />
<member id="n3" label="3" parent="n8" side="left" />
<member id="n10" label="10" parent="n8" side="right" />
<member id="n6" label="6" parent="n3" side="right" />
<change label="Insertar 8" add="n8">El 8 llega a un árbol vacío y es su primer nodo.</change>
<change label="Insertar 3" add="n3" mark="n8">El 3 es menor que 8: baja a la izquierda.</change>
<change label="Insertar 10" add="n10" mark="n8">El 10 es mayor que 8: baja a la derecha.</change>
<change label="Insertar 6" add="n6" mark="n8 n3" ask="¿Dónde queda el 6: debajo de qué nodo, y de qué lado?">El 6 es menor que 8 y mayor que 3: izquierda, luego derecha, a un hueco vacío.</change>
</structure>

Ningún valor movió a otro: cada uno bajó comparando y ocupó un hueco vacío. Esa regla tiene un nombre, y el árbol también.

<concept term="Árbol binario de búsqueda (ABB)" ref="source.md#Árbol binario de búsqueda (ABB)">
<define>Un árbol en el que cada nodo tiene como máximo dos hijos y, para cada nodo, todo lo de su izquierda es menor y todo lo de su derecha es mayor.</define>
<analogy>Adivinar un número con "más alto" o "más bajo": cada respuesta descarta un lado entero.</analogy>
<example>En esta práctica no se admiten valores repetidos: si llega otro 3, la inserción se rechaza y el árbol no cambia.</example>
</concept>

<concept term="Raíz y hoja" ref="source.md#Raíz, hoja y subárbol">
<define>La raíz es el primer nodo, el primer valor insertado. Una hoja es un nodo sin hijos. Un subárbol es un nodo con todos sus descendientes.</define>
<analogy>El tronco y las puntas de las ramas.</analogy>
<example>En el árbol 8, 3, 10, 6 la raíz es 8, y las hojas son 10 y 6.</example>
</concept>

<compare id="mover" title="Un valor nuevo nunca mueve a otro: ocupa un hueco" a="Lo que se suele creer" b="Lo que pasa al insertar" ref="source.md#Errores frecuentes" arc="contrast">
<pair label="Al insertar el 6" a="se mete entre los nodos y los empuja" b="baja comparando y queda como hoja a la derecha del 3" winner="b" />
<pair label="Los nodos que ya están" a="se mueven para hacerle sitio" b="no se mueven nunca" winner="b" />
<pair label="Si el valor ya existe" a="se añade otra vez" b="la inserción se rechaza" winner="b" />
</compare>

Para medir un árbol hacen falta cuatro medidas. En esta práctica se cuentan **aristas** (las líneas), no nodos.

<concept term="Nivel y altura" ref="source.md#Nivel y altura">
<define>El nivel de un nodo es la cantidad de aristas desde la raíz hasta él; la raíz está en el nivel 0. La altura del árbol es el nivel de la hoja más profunda.</define>
<analogy>Los pisos de un edificio contando la planta baja como piso 0.</analogy>
<example>Un árbol con un solo nodo tiene altura 0, y un árbol vacío, altura −1.</example>
</concept>

<concept term="Longitud de camino interno (LCI)" ref="source.md#Longitud de camino">
<define>La suma de los niveles de todos los nodos. Dividida entre la cantidad de nodos da la longitud de camino media.</define>
<analogy>Los pasos que daría alguien que visita cada nodo empezando siempre desde la raíz.</analogy>
</concept>

<concept term="Factor de equilibrio (FE)" ref="source.md#Factor de equilibrio">
<define>En cada nodo, la altura de su subárbol izquierdo menos la del derecho. Un árbol está balanceado si todos sus nodos cumplen |FE| ≤ 1.</define>
<analogy>Una balanza de dos platos: el FE dice cuánto pesa más un lado.</analogy>
<formula>FE = \text{altura}(\text{izq}) - \text{altura}(\text{der})</formula>
<example>Un subárbol vacío mide −1 y una hoja mide 0.</example>
</concept>

<trace id="medir" title="Altura 2, LCI 4 y balanceado: así se mide este árbol" arc="answer" ref="source.md#Ejemplo guiado">
<value kind="table" label="Nivel de cada nodo" note="8 en el nivel 0; 3 y 10 en el nivel 1; 6 en el nivel 2.">8=0|3=1|10=1|6=2</value>
<value kind="number" label="Altura" note="La hoja más profunda, el 6, está en el nivel 2.">2</value>
<value kind="bars" label="Longitud de camino interno" note="0 + 1 + 1 + 2 = 4, y la media es 4 / 4 = 1.0.">8=0|3=1|10=1|6=2</value>
<value kind="number" label="LCI" note="La suma de los cuatro niveles.">4</value>
<value kind="table" label="Factor de equilibrio" note="FE(8) = 1 − 0 = 1 y FE(3) = −1 − 0 = −1: todos cumplen |FE| ≤ 1.">8=1|3=−1|10=0|6=0</value>
</trace>

La forma también tiene nombre, y un árbol puede cumplir varios tipos a la vez, o ninguno.

<concept term="Árbol lleno, árbol completo, árbol degenerado" ref="source.md#Tipos de árbol según su forma">
<define>Lleno (estricto): cada nodo tiene 0 o 2 hijos. Completo: todos los niveles llenos salvo quizá el último, que se llena de izquierda a derecha. Degenerado: cada nodo tiene como máximo un hijo, y el árbol parece una lista.</define>
<analogy>Un árbol degenerado es una fila india: para llegar al último hay que pasar por todos.</analogy>
<example>El árbol 8, 3, 10, 6 no es lleno (el 3 tiene un solo hijo) ni completo (el 6 aparece después de un hueco); tampoco es perfecto ni degenerado.</example>
</concept>

Un árbol **perfecto** tiene dos hijos en cada nodo interno y todas las hojas en el mismo nivel; con altura h tiene exactamente $2^{h+1} - 1$ nodos, y todo árbol perfecto es también lleno y completo. Lleno y completo no son lo mismo: un árbol puede ser completo sin ser lleno, y lleno sin ser completo.

<structure id="lista" title="Valores ya ordenados hacen un árbol degenerado" arc="apply" ref="source.md#Paso 3: el orden de inserción define la forma">
<member id="m10" label="10" />
<member id="m20" label="20" parent="m10" side="right" />
<member id="m30" label="30" parent="m20" side="right" />
<member id="m40" label="40" parent="m30" side="right" />
<change label="Insertar 10" add="m10">El 10 es el primer nodo.</change>
<change label="Insertar 20" add="m20" mark="m10">Mayor que 10: a la derecha.</change>
<change label="Insertar 30" add="m30" mark="m10 m20">Mayor que todos los anteriores: siempre a la derecha.</change>
<change label="Insertar 40" add="m40" mark="m10 m20 m30">Cada nodo tiene un solo hijo: el árbol es una lista y pierde su ventaja.</change>
</structure>

Si primero entra un valor central, el árbol se reparte mejor y su altura es menor: en cada comparación se descarta casi la mitad de los datos.

> [!WARNING]
> **Errores frecuentes.** Empezar los niveles en 1 (la raíz está en el nivel 0). Usar 0 como altura de un subárbol vacío (mide −1). Restar al revés en el factor de equilibrio (es izquierda menos derecha). Olvidar el `return` en `insertar`: sin devolver el nodo, el enlace del padre se pierde y el árbol queda roto.

<quiz id="nueve" question="Después de 8, 3, 10 y 6 se inserta el 9. ¿Dónde queda, y sigue balanceado el árbol?">
<option correct="true" why="9 es mayor que 8 y menor que 10: queda como hoja a la izquierda del 10. Entonces FE(10) = 0 − (−1) = 1 y FE(8) = 1 − 1 = 0: todo cumple |FE| ≤ 1.">A la izquierda del 10, y sigue balanceado</option>
<option why="El 9 es menor que 10, así que baja a la izquierda del 10, no a la derecha.">A la derecha del 10, y deja de estar balanceado</option>
<option why="Un valor nuevo nunca mueve a otro: el 10 se queda donde está y el 9 ocupa un hueco.">Ocupa el lugar del 10, que baja un nivel</option>
</quiz>
