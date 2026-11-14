# ¿Por qué una deuda al 12 % crece más de un 36 % en tres años?

<brief form="quantity">
<audience>Adultos sin formación financiera que van a pedir un préstamo</audience>
<question>¿Por qué una deuda al 12 % anual crece más de un 36 % en tres años, y qué la frena?</question>
<example>Se piden prestados 1 000 € al 12 % anual y no se paga nada durante 3 años</example>
<misconception>Creer que un 12 % anual durante 3 años equivale a un 36 % en total</misconception>
<check>Predecir cuánto se debe al cabo de 3 años y cuánto más que con interés simple</check>
<terms>interés simple, interés compuesto, regla del 72</terms>
</brief>

<theme name="business math" />

Una persona pide prestados **1 000 €** a una tasa del **12 % anual** y no paga nada durante tres años. La tasa de interés dice cuánto cuesta el dinero en cada periodo, como porcentaje de lo que se debe.

<trace id="tres-anos" title="1 000 € se convierten en 1 404,93 € en tres años" arc="example" ref="source.md#Ejemplo ancla: 1 000 € al 12 % anual sin pagar nada">
<value kind="table" label="Al pedir el préstamo" note="Se reciben 1 000 € y no se devuelve nada durante tres años.">deuda=1 000,00 €</value>
<value kind="table" label="Año 1" note="El 12 % de 1 000 € son 120,00 €, que se suman a la deuda.">deuda=1 120,00 €|interés del año=120,00 €</value>
<value kind="table" label="Año 2" note="El 12 % se calcula ahora sobre 1 120 €: el interés sube a 134,40 €.">deuda=1 254,40 €|interés del año=134,40 €</value>
<value kind="table" label="Año 3" note="Sobre 1 254,40 € el interés ya es 150,53 €: cada año pesa más que el anterior.">deuda=1 404,93 €|interés del año=150,53 €</value>
</trace>

El interés de cada año es mayor que el del anterior porque se calcula sobre una deuda mayor. Hay dos maneras de calcular el interés, y la diferencia está justo ahí.

<concept term="Interés simple" ref="source.md#Interés simple e interés compuesto">
<define>El interés de cada periodo se calcula siempre sobre el capital inicial, así que cada año se suma la misma cantidad.</define>
<analogy>Un alquiler fijo: cada mes se paga lo mismo, pase lo que pase.</analogy>
<example>Al 12 % sobre 1 000 €: 120,00 € cada año, y 1 360,00 € al cabo de 3 años.</example>
</concept>

<concept term="Interés compuesto" ref="source.md#Interés simple e interés compuesto">
<define>El interés de cada periodo se calcula sobre todo lo que se debe, capital más intereses acumulados: el interés pasa a la deuda y también genera interés.</define>
<analogy>Una bola de nieve que rueda cuesta abajo: cuanto más grande es, más nieve recoge en cada vuelta.</analogy>
<example>Al 12 % sobre 1 000 €: 120,00 €, luego 134,40 €, luego 150,53 €; 1 404,93 € al cabo de 3 años.</example>
</concept>

<chart id="dos-formas" title="El compuesto se separa del simple un poco más cada año" arc="idea" type="bars" series="simple|compuesto" unit="€" ref="source.md#Ejemplo ancla: 1 000 € al 12 % anual sin pagar nada">
<row label="Año 1" values="1120.00|1120.00" />
<row label="Año 2" values="1240.00|1254.40" />
<row label="Año 3" values="1360.00|1404.93" />
</chart>

<compare id="mito" title="Un 12 % durante 3 años no es un 36 %" a="Lo que se suele pensar" b="Lo que pasa con interés compuesto" ref="source.md#Error frecuente" arc="contrast">
<pair label="Crecimiento total durante 3 años" a="36 %: se cree que equivale a tres veces 12 %" b="40,49 %, porque 1,12 × 1,12 × 1,12 = 1,4049" winner="b" />
<pair label="Deuda final" a="1 360,00 €" b="1 404,93 €: 44,93 € más" winner="b" />
<pair label="Interés de cada año" a="siempre 120,00 €" b="120,00 €, 134,40 €, 150,53 €" winner="b" />
</compare>

Cada año la deuda se multiplica por 1,12. Tres años seguidos son tres multiplicaciones, no tres sumas.

<derive id="formula" title="La deuda final sale de multiplicar tres veces por 1,12" ref="source.md#La fórmula" arc="answer">
<line note="Deuda final igual a capital por (1 + tasa) elevado a los años.">D = C \cdot (1 + i)^{n}</line>
<line note="Nuestro ejemplo: 1 000 € al 12 % durante 3 años.">D = 1000 \cdot 1{,}12^{3}</line>
<line note="1,12 elevado a 3 es 1,4049.">D = 1000 \cdot 1{,}4049</line>
<line note="La deuda al cabo de tres años, igual que en la tabla.">D = 1404{,}93</line>
</derive>

**Cada cuánto se suman los intereses también cuenta.** El 12 % anual puede sumarse una vez al año o cada mes (1 % al mes). Con suma mensual, después de 1 año la deuda es 1 000 × 1,01¹² = 1 126,83 €, es decir, 6,83 € más que con suma anual (1 120,00 €). Cuanto más seguido se suman los intereses, más crece la deuda.

<concept term="Regla del 72" ref="source.md#La regla del 72">
<define>Para estimar en cuántos años se duplica una deuda que no se paga, se divide 72 entre la tasa anual en porcentaje.</define>
<analogy>Una cuenta de cabeza, como calcular la propina redondeando.</analogy>
<example>Al 12 %: 72 / 12 = 6 años. Al 6 %: 72 / 6 = 12 años.</example>
</concept>

<stats id="frenos" title="Pagar al menos el interés detiene el crecimiento" arc="apply">
<stat value="120,00 €" label="al año pagan el interés de 1 000 € al 12 %: la deuda se queda en 1 000 €" />
<stat value="6 años" label="tarda en duplicarse la deuda al 12 % si no se paga nada" />
<stat value="1 126,83 €" label="se deben tras 1 año si el interés se suma cada mes" />
</stats>

Si se paga cada año al menos el interés, la deuda no crece. Si se paga menos que el interés, sigue creciendo. Si se paga más, lo que sobra reduce el capital.

<quiz id="prediccion" question="Con 1 000 € al 12 % anual sin pagar nada, ¿cuánto se debe tras tres años, y cuánto más que con interés simple?">
<option why="Es el resultado con interés simple: 120 € cada año sobre los 1 000 € iniciales.">1 360,00 €, lo mismo que con interés simple</option>
<option correct="true" why="Cada año se multiplica por 1,12: 1 000 × 1,12³ = 1 404,93 €, que son 44,93 € más que los 1 360,00 € del simple.">1 404,93 €, 44,93 € más</option>
<option why="El interés se cobra cada año que la deuda sigue sin pagarse, no solo el primero.">1 120,00 €, porque el interés solo se cobra el primer año</option>
</quiz>
