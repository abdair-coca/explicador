# ¿Por qué una deuda crece cada vez más rápido?

<theme name="business" />

Pedir prestados 1 000 € al 12 % anual y no pagar nada parece costar 120 € por año. Pero el interés del segundo año ya es mayor que el del primero. Seguimos esta deuda durante tres años.

<trace id="deuda" title="Cada año el interés se calcula sobre una deuda mayor" ref="source.md:16-20">
<value kind="table" label="Año 1: se debe 1 000 €" note="El 12 % de 1 000 € son 120 €, que se suman a la deuda.">inicio=1 000,00 €|interés=120,00 €|final=1 120,00 €</value>
<value kind="table" label="Año 2: se debe 1 120 €" note="El 12 % se calcula sobre 1 120 €, no sobre 1 000 €: son 134,40 €.">inicio=1 120,00 €|interés=134,40 €|final=1 254,40 €</value>
<value kind="table" label="Año 3: se debe 1 254,40 €" note="El interés sube otra vez, a 150,53 €, porque la deuda ya incluye los intereses anteriores.">inicio=1 254,40 €|interés=150,53 €|final=1 404,93 €</value>
</trace>

<chart id="simple-vs-compuesto" title="El interés compuesto se separa del simple cada año" type="line" series="Simple|Compuesto" unit=" €" ref="source.md:22">
<row label="Año 0" values="1000|1000" />
<row label="Año 1" values="1120|1120" />
<row label="Año 2" values="1240|1254.40" />
<row label="Año 3" values="1360|1404.93" />
</chart>

<concept term="Interés compuesto">
<define>El interés de cada periodo se calcula sobre todo lo que se debe: el capital más los intereses acumulados.</define>
<analogy>Como una bola de nieve que, al rodar, recoge más nieve cuanto más grande es.</analogy>
<formula>D = C\,(1 + i)^{n}</formula>
<example>Con 1 000 € al 12 % anual, tras 3 años se deben 1 404,93 €; con interés simple serían 1 360,00 €.</example>
</concept>

<derive id="formula" title="La deuda se multiplica por 1,12 cada año" ref="source.md:24-28">
<line note="La deuda final es el capital por (1 + tasa) elevado al número de años.">D = C\,(1 + i)^{n}</line>
<line note="Ponemos 1 000 € de capital, 12 % de tasa y 3 años.">D = 1000 \times 1{,}12^{3}</line>
<line note="Tres multiplicaciones por 1,12 dan la deuda del ejemplo.">D = 1404{,}93</line>
</derive>

<calc id="suma" title="La deuda final suma el capital y tres intereses" kind="sum" total="1404.93" ref="source.md:16-20">
<part label="Capital" value="1000" note="Lo que se recibió el primer día." />
<part label="Interés del año 1" value="120" note="12 % de 1 000 €." />
<part label="Interés del año 2" value="134.40" note="12 % de 1 120 €." />
<part label="Interés del año 3" value="150.53" note="12 % de 1 254,40 €." />
</calc>

<compare id="capitalizacion" title="Sumar los intereses cada mes cuesta más que cada año" a="Cada año" b="Cada mes" ref="source.md:30-32">
<pair label="Tasa por periodo" a="12 %" b="1 %" winner="tie" />
<pair label="Deuda tras 1 año" a="1 120,00 €" b="1 126,83 €" winner="a" />
<pair label="Diferencia" a="—" b="6,83 € más" winner="a" />
</compare>

<concept term="Regla del 72">
<define>Para saber en cuántos años se duplica una deuda que no se paga, divide 72 entre la tasa anual en porcentaje.</define>
<analogy>Como un atajo de calculadora para no tener que elevar a una potencia.</analogy>
<example>Al 12 %: 72 / 12 = 6 años. Al 6 %: 72 / 6 = 12 años.</example>
</concept>

<stats title="La deuda a los 3 años">
<stat value="1 404,93 €" label="deuda final con interés compuesto" />
<stat value="40,49 %" label="crecimiento total, no 36 %" />
<stat value="6 años" label="para duplicarse al 12 %" />
</stats>

<quiz question="Pagas cada año exactamente el interés de 120 €. ¿Qué pasa con la deuda de 1 000 €?">
<option correct="true" why="Todo el pago cubre el interés del año, así que el capital no crece ni baja.">Se queda en 1 000 €</option>
<option why="Solo crece si se paga menos que el interés.">Sigue creciendo cada año</option>
<option why="Para bajar el capital hay que pagar más que el interés.">Baja 120 € cada año</option>
</quiz>
