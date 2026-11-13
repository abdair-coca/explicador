# ¿Qué camino recorre un proyecto hasta ser ley?

<theme name="business" />

Una ley necesita pasar por dos cámaras y por el ejecutivo. Seguimos una ley de bibliotecas escolares que propone un grupo de diputados.

<flow id="camino" title="Un proyecto pasa por una comisión, dos cámaras y el ejecutivo">
  <node id="diputados" label="Diputados" desc="Presentan el proyecto" kind="actor" ref="source.md:17" />
  <node id="comision" label="Comisión" desc="Estudia el proyecto en detalle" kind="module" ref="source.md:18" />
  <node id="baja" label="Cámara baja" desc="Vota primero, 100 diputados" kind="service" ref="source.md:19" />
  <node id="alta" label="Cámara alta" desc="Revisa y vota, 40 senadores" kind="service" ref="source.md:20" />
  <node id="ejecutivo" label="Ejecutivo" desc="Firma o veta la ley" kind="actor" ref="source.md:21" />
  <node id="diario" label="Diario oficial" desc="Publica la ley" kind="store" ref="source.md:23" />
  <step from="diputados" to="comision" label="proyecto" ref="source.md:17-18">El proyecto entra por la cámara baja y se envía a una comisión.</step>
  <step from="comision" to="baja" label="informe" ref="source.md:18-19">La comisión devuelve su informe y el pleno de la cámara baja lo vota.</step>
  <step from="baja" to="alta" label="aprobado" ref="source.md:20">Si lo aprueba, pasa a la cámara alta, que repite comisión, debate y votación.</step>
  <step from="alta" to="ejecutivo" label="aprobado" ref="source.md:21">Con ambas cámaras a favor, el proyecto llega al presidente.</step>
  <step from="ejecutivo" to="diario" label="sanción" ref="source.md:23">Si firma, la ley se publica en el diario oficial y entra en vigor.</step>
  <code node="alta" ref="source.md:20">Si la cámara revisora cambia el texto, vuelve a la cámara de origen.</code>
</flow>

<trace id="votos" title="Una votación necesita más de la mitad de los presentes" ref="source.md:19">
<value label="Quién asiste a la sesión" note="Hay quórum: se necesitan 51 de 100 diputados.">80 diputados presentes</value>
<value kind="number" label="Mayoría simple" note="Más de la mitad de 80 son 41 votos a favor.">41</value>
<value label="Resultado de la votación" note="Con 58 votos a favor el proyecto pasa a la cámara alta.">58 a favor, 22 en contra</value>
</trace>

<chart id="mayorias" title="Insistir tras un veto exige más votos que aprobar" type="bars" unit=" votos" highlight="Dos tercios" ref="source.md:19-22">
<row label="Mayoría simple" values="41" />
<row label="Dos tercios" values="54" />
</chart>

<concept term="Veto">
<define>Cuando el ejecutivo devuelve un proyecto aprobado a las cámaras con objeciones, en lugar de firmarlo.</define>
<analogy>Como el freno de mano de un coche: detiene la ley, pero las cámaras pueden soltarlo.</analogy>
<example>Tras un veto, las cámaras pueden insistir con dos tercios de los presentes: con 80 presentes, 54 votos.</example>
</concept>

<timeline id="etapas" title="El proyecto atraviesa siete etapas hasta entrar en vigor" ref="source.md:15-23">
<event label="Iniciativa" when="1">Se presenta el proyecto en la cámara de origen.</event>
<event label="Comisión" when="2">Un grupo pequeño estudia el texto y propone cambios.</event>
<event label="Votación en la cámara de origen" when="3">El pleno aprueba por mayoría simple.</event>
<event label="Cámara revisora" when="4">La otra cámara lo estudia y lo vota.</event>
<event label="Sanción o veto" when="5">El ejecutivo firma o devuelve el proyecto.</event>
<event label="Insistencia" when="6">Tras un veto, dos tercios de cada cámara pueden imponerlo.</event>
<event label="Publicación" when="7">El diario oficial publica la ley y entra en vigor.</event>
</timeline>

<quiz question="¿Qué etapa estudia el proyecto en detalle antes de que el pleno lo vote?">
<option correct="true" why="La comisión es un grupo pequeño que estudia el texto y propone cambios.">La comisión</option>
<option why="El ejecutivo recibe el proyecto después de las cámaras.">El ejecutivo</option>
<option why="El diario oficial solo publica la ley ya sancionada.">El diario oficial</option>
</quiz>
