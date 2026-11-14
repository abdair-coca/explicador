# ¿Qué debe cada parte en este contrato de alquiler?

<theme name="business" />

Marta alquila un apartamento a Pablo por 12 meses. Estas son las cláusulas que más dinero y decisiones mueven.

<arch id="partes" title="Pablo paga la renta y Marta entrega el apartamento">
  <node id="marta" label="Marta Quiroga" desc="Arrendadora: entrega y mantiene el apartamento" kind="actor" ref="source.md:1-5" />
  <node id="pablo" label="Pablo Reyes" desc="Arrendatario: vive en él y paga" kind="actor" ref="source.md:1-5" />
  <node id="apto" label="Apartamento 3B" desc="Vivienda de uso exclusivo" kind="store" ref="source.md:5" />
  <node id="garantia" label="Garantía de 900 €" desc="Dos meses de renta en depósito" kind="store" ref="source.md:13" />
  <edge from="marta" to="apto" label="entrega" />
  <edge from="pablo" to="garantia" label="deposita" />
  <edge from="pablo" to="marta" label="450 € al mes" />
  <code node="garantia" ref="source.md:13">Se devuelve al terminar, salvo daños que no sean desgaste normal.</code>
</arch>

<timeline id="calendario" title="Cada mes hay un plazo y a la vez una consecuencia" ref="source.md:7-23">
<event label="Inicio" when="1 de marzo de 2026">Empieza el contrato de 12 meses.</event>
<event label="Pago de la renta" when="Día 5 de cada mes">Pablo paga 450 € por adelantado.</event>
<event label="Mora" when="Desde el día 6">Cada día de retraso suma 5 € de mora.</event>
<event label="Aviso de salida" when="30 días antes de irse">Pablo debe avisar por escrito y pagar 450 € de penalización.</event>
<event label="Aviso de no renovar" when="60 días antes del fin">Si nadie avisa, el contrato se renueva por 12 meses.</event>
<event label="Fin" when="28 de febrero de 2027">Termina el contrato y se devuelve la garantía.</event>
</timeline>

<calc id="mes-tarde" title="Un pago con 3 días de retraso cuesta 15 € más" kind="sum" total="465" ref="source.md:9-11">
<part label="Renta del mes" value="450" note="Cláusula 3: se paga hasta el día 5." />
<part label="Mora de 3 días" value="15" note="Cláusula 4: 5 € por cada día de retraso." />
</calc>

<compare id="gastos" title="Pablo paga lo corriente y Marta lo estructural" a="Pablo" b="Marta" ref="source.md:15-17">
<pair label="Servicios" a="Agua, luz e internet" b="Cuota del edificio" />
<pair label="Reparaciones" a="Menores, de menos de 50 €" b="Mayores: techo, tuberías, instalación eléctrica" />
</compare>

<concept term="Garantía">
<define>Dinero que el arrendatario deja en depósito para cubrir daños y que se devuelve al terminar el contrato.</define>
<analogy>Como la fianza de un coche de alquiler: se devuelve si lo entregas bien.</analogy>
<example>Aquí son 900 €, dos meses de renta.</example>
</concept>

<quiz question="¿Qué hace Marta con la garantía al terminar el contrato?">
<option correct="true" why="Solo descuenta los daños que no sean desgaste normal.">La devuelve, descontando los daños</option>
<option why="La garantía no es una renta adelantada: se devuelve.">La conserva como renta del último mes</option>
<option why="Se devuelve al terminar el contrato, no a mitad.">La devuelve a los seis meses</option>
</quiz>
