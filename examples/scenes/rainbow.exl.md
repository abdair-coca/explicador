# ¿Cómo se forma un arcoíris?

<brief form="process">
<audience>Público curioso; sabe que la luz del Sol parece blanca y que llueve, no sabe de óptica</audience>
<question>¿Cómo convierte una gota de lluvia la luz blanca del Sol en un arco de colores?</question>
<example>Un rayo de luz del Sol entra en una gota, rebota en su fondo y sale con el rojo a 42° y el violeta a 40°</example>
<misconception>Creer que el arcoíris es un objeto quieto en un lugar del cielo</misconception>
<check>Predecir qué color queda en el borde de fuera del arco</check>
<terms>dispersión</terms>
</brief>

<theme name="plain" />

Después de la lluvia, con el Sol a tu espalda, aparece un arco de colores. Todo empieza con un rayo de luz y una gota.

<trace title="Un rayo blanco entra en la gota y sale en colores" arc="example">
<value label="Llega del Sol">luz blanca</value>
<value kind="list" label="Al entrar en el agua" note="El agua frena la luz y la desvía; cada color se desvía un poco distinto.">rojo|naranja|amarillo|verde|azul|violeta</value>
<value kind="list" label="En el fondo de la gota" note="La cara de atrás de la gota hace de espejo y devuelve los colores.">rojo|naranja|amarillo|verde|azul|violeta</value>
<value kind="table" label="Al salir hacia tu ojo" note="El rojo sale a unos 42° de la dirección de la luz; el violeta, a unos 40°.">rojo=42°|violeta=40°</value>
</trace>

Ese reparto de colores tiene nombre.

<concept term="Dispersión" arc="idea">
<define>Separación de la luz blanca en sus colores, porque el agua desvía cada color un ángulo distinto.</define>
<analogy>Como un grupo de ciclistas que entra en un camino de arena: cada uno frena distinto y salen separados.</analogy>
<example>En el agua, el violeta se desvía un poco más que el rojo: por eso salen a 40° y a 42°.</example>
</concept>

<figure title="La gota separa la luz y la devuelve a tu ojo" arc="answer">
<circle id="gota" x="60" y="24" r="14" color="blue" />
<label x="84" y="8" color="blue">Gota de lluvia</label>
<icon id="sol" kind="sun" x="6" y="12" size="8" color="orange" label="Sol" />
<icon id="ojo" kind="eye" x="43.6" y="55.1" size="5" label="Tu ojo" />
<arrow id="luz" points="sol.right gota@239.5" label="Luz blanca" />
<normal id="normal" at="gota@239.5" label="Normal" desc="La recta perpendicular a la superficie: desde ella se miden los ángulos" />
<arrow id="dentro" points="gota@239.5 gota@338.8" color="gray" label="Se desvía" />
<arrow id="rebote" points="gota@338.8 gota@78.1" color="gray" label="Rebota" />
<normal id="normal2" at="gota@78.1" />
<arrow id="rojo" points="gota@78.1 ojo.top-right" color="red" />
<arrow id="violeta" points="gota@80.5 53.2 45.6" color="violet" />
<arrow id="linea" points="ojo.right 95 55.1" head="none" dashed="yes" color="gray" label="Dirección de la luz" />
<angle id="angulo" at="ojo.center" from="95 55.1" to="gota@78.1" color="red" label="42°" />
<show items="sol luz">La luz blanca del Sol llega a la gota.</show>
<show items="normal dentro">Al entrar, el agua la desvía respecto a la normal, cada color un poco distinto.</show>
<show items="rebote">El fondo de la gota la refleja hacia delante.</show>
<show items="normal2 rojo violeta">Al salir se desvía otra vez: el rojo más abierto, el violeta más cerrado.</show>
<show items="ojo linea angulo">Tu ojo recibe el rojo de las gotas que están a 42° de la dirección de la luz.</show>
</figure>

<figure title="Las gotas a 42° de tu sombra dibujan el arco" arc="answer">
<zone points="0 40 100 40 100 60 0 60" color="green" />
<label x="90" y="56" color="green">Suelo</label>
<label x="20" y="5" color="orange">El Sol, a tu espalda</label>
<circle id="sombra" x="50" y="52" r="1.2" label="Sombra de tu cabeza" desc="El punto opuesto al Sol: el arco es un círculo alrededor de él" />
<arc id="rojo" x="50" y="52" r="42" from="197" to="343" color="red" />
<arc id="naranja" x="50" y="52" r="41.6" from="197" to="343" color="orange" />
<arc id="amarillo" x="50" y="52" r="41.2" from="197" to="343" color="yellow" />
<arc id="verde" x="50" y="52" r="40.8" from="197" to="343" color="green" />
<arc id="azul" x="50" y="52" r="40.4" from="197" to="343" color="blue" />
<arc id="violeta" x="50" y="52" r="40" from="197" to="343" color="violet" />
<icon id="g1" kind="drop" x="23" y="19.8" size="3" color="red" />
<icon id="g2" kind="drop" x="77" y="19.8" size="3" color="red" />
<icon id="g3" kind="drop" x="36.3" y="14.4" size="3" color="violet" />
<measure id="radio" from="sombra.center" to="rojo@300">42°</measure>
<show items="rojo g1 g2">Las gotas a 42° de la sombra de tu cabeza te mandan su rojo.</show>
<show items="violeta g3">Las que están a 40° te mandan su violeta: por eso queda por dentro.</show>
<show items="naranja amarillo verde azul">Los demás colores llenan la banda entre los dos.</show>
<show items="radio">Cada persona tiene su sombra, así que cada una ve su propio arco.</show>
</figure>

<compare title="El arcoíris no está en un lugar: depende de dónde miras" a="Lo que parece" b="Lo que ocurre" arc="contrast">
<pair label="Qué es" a="un objeto colgado en el cielo" b="luz que miles de gotas devuelven a tu ojo" />
<pair label="Dónde está" a="en un sitio fijo, igual para todos" b="a 42° de tu ojo; cada persona ve el suyo" />
<pair label="Si te mueves" a="se queda quieto" b="se mueve contigo y nunca lo alcanzas" />
</compare>

<quiz question="¿Qué color ves en el borde de fuera del arco?">
<option correct="true" why="El rojo sale a unos 42°, el ángulo mayor, así que llega de las gotas más altas.">Rojo</option>
<option why="El violeta sale a unos 40°, el ángulo menor, y queda en el borde de dentro.">Violeta</option>
<option why="El verde sale a un ángulo intermedio, en el centro de la banda.">Verde</option>
</quiz>
