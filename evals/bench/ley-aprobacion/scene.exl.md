# ¿Qué camino recorre una propuesta hasta ser ley?

<brief form="process">
<audience>Adultos sin formación en derecho que quieren entender el camino de una ley</audience>
<question>¿Qué camino recorre una propuesta hasta ser ley, y quién puede frenarla en cada paso?</question>
<example>Un grupo de diputados propone la «ley de bibliotecas escolares»: una biblioteca en cada escuela</example>
<misconception>Creer que la aprobación de una cámara basta para que haya ley</misconception>
<check>Predecir qué pasa con la ley de bibliotecas si la cámara alta la modifica</check>
<terms>quórum, mayoría simple, cámara de origen, cámara revisora, veto</terms>
</brief>

<theme name="society history" />

Un grupo de diputados quiere que cada escuela tenga una biblioteca. El sistema tiene dos cámaras y un presidente (una descripción general, sin referirse a ningún país): la cámara baja, con **100 diputados**, la cámara alta, con **40 senadores**, y el presidente, que firma o devuelve las leyes.

<timeline id="bibliotecas" title="La ley de bibliotecas escolares, de una idea al diario oficial" arc="example" ref="source.md#Las etapas">
<event label="La propuesta">Los diputados presentan el proyecto en la cámara baja.</event>
<event label="El estudio">Un grupo pequeño de diputados lo estudia en detalle, escucha a expertos y propone cambios.</event>
<event label="El primer voto">Toda la cámara baja lo discute y lo vota.</event>
<event label="La otra cámara">La cámara alta lo estudia, lo discute y lo vota a su vez.</event>
<event label="La firma">El presidente lo firma, o lo devuelve con objeciones.</event>
<event label="El diario oficial">La ley firmada se publica, y solo entonces entra en vigor.</event>
</timeline>

Cada paso tiene sus reglas, y cuatro palabras las resumen.

<concept term="Quórum" ref="source.md#Las piezas">
<define>El mínimo de miembros presentes para que una cámara pueda sesionar.</define>
<analogy>Una reunión de vecinos que solo vale si viene la mitad del edificio más uno.</analogy>
<example>Cámara baja: al menos 51 de 100. Cámara alta: al menos 21 de 40.</example>
</concept>

<concept term="Mayoría simple" ref="source.md#Las etapas">
<define>Más de la mitad de los presentes votando a favor.</define>
<analogy>Ganar una votación entre amigos por al menos un voto más que la mitad.</analogy>
<example>Con 80 presentes, hacen falta al menos 41 votos a favor.</example>
</concept>

<concept term="Cámara de origen y cámara revisora" ref="source.md#Las etapas">
<define>La cámara de origen es la que recibe primero el proyecto; la cámara revisora es la otra, que lo vuelve a estudiar y votar.</define>
<analogy>Un texto que escribe una persona y corrige otra.</analogy>
<example>La ley de bibliotecas empieza en la cámara baja (origen) y pasa a la cámara alta (revisora).</example>
</concept>

<concept term="Veto" ref="source.md#Las etapas">
<define>Cuando el presidente devuelve un proyecto aprobado, con objeciones, en lugar de firmarlo (sancionarlo).</define>
<analogy>Un árbitro que anula un gol: el equipo puede reclamar, pero necesita más fuerza.</analogy>
<example>Tras un veto, las cámaras pueden insistir con dos tercios de los presentes en cada una.</example>
</concept>

<derive id="mayorias" title="Con 80 presentes, aprobar pide 41 votos e insistir 54" arc="apply" ref="source.md#Las etapas">
<line note="Mayoría simple: más de la mitad de los presentes.">80 / 2 = 40 \Rightarrow 41</line>
<line note="Insistir tras un veto: dos tercios de los presentes, redondeando hacia arriba.">80 \cdot 2/3 = 53{,}33 \Rightarrow 54</line>
</derive>

<journey id="camino" title="Siete etapas y dos cámaras hacen una ley" arc="answer">
<stage id="iniciativa" label="Iniciativa" value="cámara de origen" kind="text">Un diputado, un senador o el presidente presenta el proyecto a una cámara.</stage>
<stage id="comision" label="Comisión" value="un grupo pequeño" kind="table">Lo estudia en detalle, escucha a expertos y puede proponer cambios.</stage>
<stage id="voto" label="Debate y voto" value="mayoría simple" kind="split">El pleno de la cámara de origen discute y vota.</stage>
<stage id="revisora" label="Cámara revisora" value="otra votación" kind="split">Si la aprueba sin cambios, pasa al presidente; si la modifica, vuelve a la cámara de origen.</stage>
<stage id="sancion" label="Sanción o veto" value="el presidente" kind="model">El presidente la firma o la devuelve con objeciones.</stage>
<stage id="insistencia" label="Insistencia" value="dos tercios" kind="metric">Tras un veto, las cámaras pueden insistir con dos tercios de los presentes en cada una.</stage>
<stage id="publicacion" label="Publicación" value="diario oficial" kind="file">La ley se publica en el diario oficial y entra en vigor.</stage>
</journey>

**Si el proyecto fracasa.** Si la cámara de origen lo rechaza, no puede volver a presentarse en el mismo año legislativo. Si la cámara revisora lo rechaza, vuelve a la cámara de origen, que puede insistir con dos tercios.

<compare id="una-camara" title="Que una cámara apruebe no basta para que haya ley" a="Lo que se suele creer" b="Lo que hace falta" ref="source.md#Error frecuente" arc="contrast">
<pair label="Cámaras" a="la aprobación de una cámara basta" b="las dos cámaras" winner="b" />
<pair label="Presidente" a="no hace falta" b="su firma, o la insistencia de las cámaras tras un veto" winner="b" />
<pair label="Entrada en vigor" a="al votar" b="al publicarse en el diario oficial" winner="b" />
</compare>

<quiz id="cambios" question="La cámara alta aprueba la ley de bibliotecas, pero con cambios. ¿Qué pasa después?">
<option why="Con cambios no pasa al presidente: antes debe aceptarlos la cámara que la propuso.">Pasa directamente al presidente</option>
<option correct="true" why="Si la cámara revisora la modifica, vuelve a la cámara de origen, que decide si acepta los cambios.">Vuelve a la cámara baja, que decide si acepta los cambios</option>
<option why="Una modificación no es un rechazo: el proyecto sigue vivo.">Queda rechazada hasta el año siguiente</option>
</quiz>
