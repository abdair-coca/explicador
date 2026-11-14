# ¿Cómo sabe un semáforo inteligente que estás esperando?

<brief form="process">
<audience>Conductores y peatones curiosos; conocen los semáforos normales, no saben qué hay bajo el asfalto</audience>
<question>¿Cómo sabe un semáforo inteligente que un coche espera, y cómo decide darle el verde?</question>
<example>A las 23:00 el coche de Lucía para en la calle lateral; nadie viene por la avenida y recibe el verde en 5 segundos en vez de 60</example>
<misconception>Creer que un semáforo inteligente es un temporizador con tiempos más cortos</misconception>
<check>Predecir qué hace el semáforo si ningún coche pisa la espira</check>
<terms>control adaptativo</terms>
</brief>

<theme name="hardware" />

A las 23:00 el cruce está vacío. Las cifras son las del ejemplo, no las de un cruce real.

<stats title="Lucía espera 5 segundos en vez de 60" arc="example">
<stat value="60 s" label="Con un temporizador, aunque no venga nadie" />
<stat value="5 s" label="Con el semáforo que la detecta" />
</stats>

<figure title="La espira avisa al controlador y este le da el verde" arc="answer">
<zone points="0 24 100 24 100 36 0 36" color="gray" label="Avenida" />
<zone points="44 36 56 36 56 60 44 60" color="gray" />
<box id="espira" x="45" y="43" w="10" h="5" color="orange" label="Espira" />
<box id="coche" x="47" y="50" w="6" h="8" color="blue" label="Lucía" />
<circle id="lateral" x="61" y="39" r="2.5" color="red" label="Su semáforo" />
<circle id="avenida" x="38" y="20" r="2.5" color="green" label="Semáforo de la avenida" />
<box id="controlador" x="76" y="44" w="18" h="9" color="gray" label="Controlador" />
<arrow id="aviso" points="55 46 76 47" color="orange" dashed="yes" />
<arrow id="orden" points="76 50 64 41" color="gray" dashed="yes" />
<show move="coche: 47 41">Lucía para en la calle lateral, justo encima de la espira.</show>
<show items="aviso" pulse="espira" flow="aviso">La espira nota el metal del coche y avisa al controlador.</show>
<show set="avenida: yellow" ask="Nadie viene por la avenida. ¿Qué hace el controlador?">Nadie espera en la avenida: el controlador le pasa el amarillo.</show>
<show items="orden" flow="orden" set="avenida: red; lateral: green">Avenida en rojo y verde para Lucía: 5 segundos en vez de 60.</show>
<show move="coche: 47 30 47 2">Lucía cruza; el controlador vuelve a mirar la espira.</show>
</figure>

Ese mirar y decidir tiene nombre.

<concept term="Control adaptativo" arc="idea">
<define>Repartir el verde según los coches que se detectan en cada momento, no según un horario fijo.</define>
<analogy>Como un camarero que atiende primero la mesa que lo llama, en vez de recorrer todas aunque estén vacías.</analogy>
<example>Avenida vacía y Lucía esperando: el verde pasa a la calle lateral en 5 segundos.</example>
</concept>

<compare title="No es un temporizador con tiempos más cortos" a="Temporizador" b="Semáforo inteligente" arc="contrast">
<pair label="Cuándo cambia" a="cuando acaba el tiempo" b="cuando la espira detecta un coche" />
<pair label="Cruce vacío de noche" a="Lucía espera el ciclo entero" b="Lucía pasa en 5 segundos" />
<pair label="Lo que nunca cambia" a="el amarillo" b="el amarillo y los segundos en rojo de seguridad" />
</compare>

<quiz question="Si ningún coche pisa la espira de la calle lateral, ¿qué hace el semáforo?">
<option correct="true" why="Sin aviso de la espira nadie pide el verde, así que la avenida lo conserva.">Deja el verde a la avenida</option>
<option why="Eso haría un temporizador: cambiaría aunque no haya nadie esperando.">Cambia cada 60 segundos igualmente</option>
<option why="El verde solo pasa a la calle lateral cuando alguien lo pide.">Pone verde a la calle lateral por si acaso</option>
</quiz>
