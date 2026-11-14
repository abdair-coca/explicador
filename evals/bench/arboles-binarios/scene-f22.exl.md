# ¿Cómo organiza los datos un árbol binario de búsqueda?

<theme name="code" />

Un árbol binario de búsqueda (ABB) guarda datos para encontrarlos rápido: cada comparación decide una rama y descarta la otra. Seguimos un solo ejemplo, los valores **8, 3, 10 y 6** en ese orden, por las cinco paradas del proceso.

<arch title="El árbol 8, 3, 10 y 6: cada valor cuelga de otro">
  <node id="t8" label="8 · raíz" desc="El primer valor insertado, arriba de todo" kind="module" />
  <node id="t3" label="3 · hijo izquierdo" desc="Menor que 8, a su izquierda" kind="module" />
  <node id="t10" label="10 · hijo derecho" desc="Mayor que 8, a su derecha" kind="module" />
  <node id="t6" label="6 · hoja" desc="Mayor que 3, a su derecha; no tiene hijos" kind="module" />
  <edge from="t8" to="t3" label="izquierda" />
  <edge from="t8" to="t10" label="derecha" />
  <edge from="t3" to="t6" label="derecha" />
</arch>

<concept term="Nodo">
<define>Cada casilla del árbol: guarda un valor y puede tener hasta dos hijos, que son los nodos que cuelgan de él.</define>
<analogy>Como una caja con hasta dos cajas colgando debajo.</analogy>
<example>El 8 es el nodo raíz, el primero insertado; su hijo izquierdo es el 3 y su hijo derecho es el 10.</example>
</concept>

<concept term="Hoja">
<define>Nodo sin hijos: está al final de una rama y no tiene nada colgando.</define>
<analogy>Como la hoja al final de una ramita.</analogy>
<example>En 8, 3, 10 y 6, las hojas son el 10 y el 6.</example>
</concept>

<concept term="Altura">
<define>Número de aristas, es decir, de líneas que unen nodos, desde la raíz hasta la hoja más profunda.</define>
<analogy>Como contar escalones desde arriba hasta el piso más bajo.</analogy>
<example>En 8, 3, 10 y 6, el 6 está a dos aristas de la raíz: la altura es 2.</example>
</concept>

<journey title="Del primer valor a la clasificación, en cinco paradas">
<stage id="insert" label="Insertar" value="4 valores" kind="text" op="insertar()">Cada valor baja desde la raíz hasta un hueco libre y queda como hoja.</stage>
<stage id="order" label="Forma" value="altura 2 o 3" kind="model">El orden de llegada decide qué tan alto queda el árbol.</stage>
<stage id="measure" label="Medir" value="suma de niveles 4" kind="metric">Nivel, altura y longitud de camino cuentan aristas desde la raíz.</stage>
<stage id="balance" label="Equilibrio" value="diferencia ±1" kind="metric" op="factor_equilibrio()">Cada nodo compara la altura de sus dos subárboles.</stage>
<stage id="classify" label="Clasificar" value="lleno o degenerado" kind="split">Contar los hijos de cada nodo dice qué forma tiene el árbol.</stage>
</journey>

<chapter title="Cada valor baja hasta un hueco vacío" goal="Insertar valores en un ABB comparando desde la raíz." stage="insert" />

En un ABB, lo menor va a la izquierda de cada nodo y lo mayor a la derecha. Así, cada comparación decide una rama.

<concept term="Árbol binario de búsqueda (ABB)">
<define>Árbol donde cada nodo tiene como máximo dos hijos, con los menores a la izquierda y los mayores a la derecha.</define>
<analogy>Un cruce de dos caminos: en cada letrero eliges izquierda o derecha según el número que llevas.</analogy>
<example>Con 8 como raíz, el 3 queda a su izquierda y el 10 a su derecha.</example>
</concept>

<flow title="Insertar 6 cuesta dos comparaciones y queda como hoja">
  <node id="valor" label="Valor 6" desc="Valor nuevo que llega al árbol" kind="actor" />
  <node id="insertar" label="insertar(nodo, valor)" desc="Compara y baja hasta un hueco vacío" kind="function" ref="source.md:145-152" />
  <node id="hueco" label="Hueco libre" desc="Hijo derecho libre de 3: aquí queda el 6" kind="module" />
  <step from="valor" to="insertar" label="llega el 6">El 6 llega a la función de inserción, que empieza en la raíz.</step>
  <step from="insertar" label="6 es menor que 8">Compara con la raíz 8: como 6 es menor, la búsqueda baja a la izquierda.</step>
  <step from="insertar" label="6 es mayor que 3">Compara con el 3: como 6 es mayor, la búsqueda baja a la derecha de 3.</step>
  <step from="insertar" to="hueco" label="queda como hoja">El hueco está libre: 6 queda como hoja y ningún nodo se mueve.</step>
  <code node="insertar" ref="source.md:145-152">Cada llamada devuelve el nodo, así el enlace del padre no se pierde.</code>
</flow>

<trace title="Cada valor entra en su hueco y ninguno se mueve">
<value kind="list" label="Valores que llegan">8|3|10|6</value>
<value kind="table" label="Dónde queda cada uno" note="Cada valor baja comparando desde la raíz hasta un hueco libre.">8=raíz|3=izquierda de 8|10=derecha de 8|6=derecha de 3</value>
<value label="Forma final" note="Ningún valor cambió de lugar después de entrar.">8 con 3 a la izquierda y 10 a la derecha; 6 cuelga de 3</value>
</trace>

<quiz question="Al insertar un valor que ya existe, ¿qué pasa?">
<option correct="true" why="Un valor repetido no entra en ninguna rama, así que nada se mueve.">La inserción se rechaza y el árbol no cambia</option>
<option why="Un ABB de esta práctica no admite repetidos: el nodo que ya está se queda.">El nuevo valor reemplaza al nodo existente</option>
</quiz>

<chapter title="El orden de llegada decide la altura" goal="Predecir cómo cambia la forma del árbol según el orden de inserción." stage="order" />

Si los valores llegan ordenados, cada uno baja siempre por la derecha y el árbol se vuelve una lista. Si primero llega un valor central, el árbol se reparte.

<chart title="Los mismos cuatro valores dan altura 3 o 2" type="bars" unit="altura">
<row label="10, 20, 30, 40 (ordenados)" values="3" />
<row label="30, 10, 40, 20 (central primero)" values="2" />
</chart>

<quiz question="¿Qué pasa si insertas 10, 20, 30 y 40 en ese orden?">
<option correct="true" why="Cada valor es mayor que todos los anteriores, así que siempre baja por la derecha.">El árbol queda degenerado, con altura 3</option>
<option why="Un ABB no reordena lo que ya entró: cada valor ocupa el lugar donde llega.">El árbol se reordena solo y queda con altura 2</option>
</quiz>

<chapter title="Medir el árbol paso a paso" goal="Calcular el nivel de un nodo, la altura del árbol y la longitud de camino interno." stage="measure" />

Cada nodo tiene un nivel: las aristas que hay desde la raíz hasta él. La altura es el nivel de la hoja más profunda.

<arch title="Los niveles cuentan aristas desde la raíz">
  <node id="a" label="8 · raíz" desc="Nivel 0: primer valor insertado" />
  <node id="b" label="3" desc="Nivel 1: hijo izquierdo de 8" />
  <node id="c" label="10" desc="Nivel 1: hijo derecho de 8" />
  <node id="d" label="6 · hoja" desc="Nivel 2: hijo derecho de 3" />
  <edge from="a" to="b" label="izquierda" />
  <edge from="a" to="c" label="derecha" />
  <edge from="b" to="d" label="derecha" />
</arch>

<calc title="La longitud de camino interno suma los niveles" kind="sum" total="4">
<part label="8 · raíz" value="0" note="La raíz está en el nivel 0." />
<part label="3" value="1" note="Una arista desde la raíz." />
<part label="10" value="1" note="Una arista desde la raíz." />
<part label="6" value="2" note="Dos aristas: de 8 a 3 y de 3 a 6." />
</calc>

La altura es 2, porque la hoja más profunda, el 6, está en el nivel 2. La longitud de camino media es 4 dividido entre 4 nodos: 1.0.

<quiz question="¿Cuál es la altura del árbol 8, 3, 10, 6?">
<option correct="true" why="La hoja 6 está en el nivel 2, y la altura es el nivel de la hoja más profunda.">2</option>
<option why="Eso es la longitud de camino interno: la suma de los niveles de los cuatro nodos.">4</option>
</quiz>

<chapter title="Comparar los dos subárboles de cada nodo" goal="Calcular el factor de equilibrio de cada nodo y decidir si el árbol está balanceado." stage="balance" />

<concept term="Factor de equilibrio (FE)">
<define>Altura del subárbol izquierdo menos altura del subárbol derecho, calculada en cada nodo.</define>
<analogy>Como una balanza de dos platos: el FE dice cuánto pesa más un lado.</analogy>
<formula>\text{FE} = \text{altura}(\text{izq}) - \text{altura}(\text{der})</formula>
<example>Un subárbol vacío mide −1: en el nodo 3, FE = −1 − 0 = −1.</example>
</concept>

<derive title="FE de la raíz 8: 1, dentro de la regla">
<line note="La definición, aplicada en la raíz.">\text{FE}(8) = \text{altura}(\text{izq}) - \text{altura}(\text{der})</line>
<line note="El subárbol de 3 tiene altura 1; el 10 es una hoja, con altura 0.">\text{FE}(8) = 1 - 0</line>
<line note="Su valor absoluto es 1, así que cumple la regla.">\text{FE}(8) = 1</line>
</derive>

<chart title="El árbol está balanceado: ningún nodo supera ±1" type="hbars" unit="FE">
<row label="8 (raíz)" values="1" />
<row label="3" values="-1" />
<row label="6" values="0" />
<row label="10" values="0" />
</chart>

<quiz question="Un nodo tiene FE = −2. ¿Qué pasa con el árbol?">
<option correct="true" why="La regla es |FE| ≤ 1, y −2 la supera en valor absoluto.">Deja de estar balanceado</option>
<option why="El signo no cuenta: la regla compara el valor absoluto del FE.">Sigue balanceado porque el signo es negativo</option>
</quiz>

<chapter title="La forma se lee en los hijos de cada nodo" goal="Clasificar un árbol como lleno, completo, perfecto o degenerado." stage="classify" />

Un árbol puede cumplir varias clasificaciones o ninguna. Empieza por contar los hijos de cada nodo.

<compare title="Lleno y degenerado describen formas opuestas" a="Lleno" b="Degenerado">
<pair label="Hijos por nodo" a="0 o 2 en cada nodo" b="como máximo 1 en cada nodo" />
<pair label="Ejemplo" a="8, 3, 10, 6 no lo es: el 3 tiene un solo hijo" b="10, 20, 30, 40 sí lo es" />
</compare>

<concept term="Árbol perfecto">
<define>Árbol donde todos los nodos internos tienen dos hijos y todas las hojas están en el mismo nivel.</define>
<analogy>Como un torneo de eliminación con llaves completas: cada ronda duplica los participantes.</analogy>
<formula>n = 2^{h+1} - 1</formula>
<example>Con altura h = 2 tiene 1 + 2 + 4 = 7 nodos.</example>
</concept>

<quiz question="¿Por qué el árbol 8, 3, 10, 6 no es lleno?">
<option correct="true" why="Un árbol lleno exige 0 o 2 hijos en cada nodo, y el 3 tiene solo uno.">Porque el 3 tiene un solo hijo</option>
<option why="La altura no decide si un árbol es lleno; cuentan los hijos de cada nodo.">Porque su altura es 2</option>
</quiz>

<chapter title="Repaso" goal="Responder lo que pediría un docente o un examen sobre ABB." />

<stats title="Lo que debes poder calcular">
<stat value="2" label="altura del árbol 8, 3, 10, 6" />
<stat value="4" label="longitud de camino interno" />
<stat value="1.0" label="longitud de camino media" />
<stat value="7" label="nodos de un perfecto de altura 2" />
</stats>

<quiz question="¿Dónde queda un valor nuevo que no está repetido?">
<answer>Como hoja, en el primer hueco vacío que encuentra al comparar desde la raíz; ningún nodo se mueve.</answer>
</quiz>

<quiz question="¿Qué pasa al insertar un valor repetido?">
<answer>La inserción se rechaza y el árbol no cambia, porque el valor no entra en ninguna rama.</answer>
</quiz>

<quiz question="¿Por qué 10, 20, 30, 40 da altura 3 y 30, 10, 40, 20 da altura 2?">
<answer>Insertados en orden, cada valor baja por la derecha y el árbol se alarga hasta 3 niveles; con 30 primero, los valores se reparten y la altura queda en 2.</answer>
</quiz>

<quiz question="¿Qué altura tienen un solo nodo y un árbol vacío?">
<answer>Un solo nodo tiene altura 0 y un árbol vacío tiene altura −1.</answer>
</quiz>

<quiz question="¿Cuál es el FE de una hoja?">
<answer>0, porque sus dos subárboles están vacíos: −1 − (−1) = 0.</answer>
</quiz>
