# ¿Por qué sube el pan, y qué le hace el horno?

<brief form="process">
<audience>Personas curiosas que quieren hacer su primer pan en casa</audience>
<question>¿Por qué sube el pan, y qué le pasa a la masa dentro del horno?</question>
<example>Una hogaza de 500 g de harina, 325 g de agua, 10 g de sal y 5 g de levadura seca</example>
<misconception>Pensar que el pan sube en el horno porque la levadura se activa con el calor</misconception>
<check>Predecir qué le pasa a una masa que fermenta toda la noche en la nevera</check>
<terms>hidratación, gluten, fermentación, reacción de Maillard</terms>
</brief>

<theme name="food science" />

Cuatro ingredientes y unas horas convierten una pasta pegajosa en una hogaza con corteza dorada. Sigamos una hogaza de **500 g de harina** desde el bol hasta que sale del horno.

<trace id="hogaza" title="Cuatro ingredientes se vuelven una hogaza que sube y se dora" arc="example" ref="source.md#Ejemplo ancla: una hogaza de 500 g de harina">
<value kind="table" label="En el bol" note="La sal es el 2 % del peso de la harina, y el agua, 325 / 500 = 65 %.">harina=500 g|agua=325 g|sal=10 g|levadura=5 g</value>
<value label="Después de amasar" note="Harina y agua forman una red elástica que se estira sin romperse.">una masa elástica que se estira sin romperse</value>
<value label="Después de reposar" note="La levadura se come los azúcares de la harina y suelta gas, que hincha la masa.">una masa que ha subido, llena de burbujas</value>
<value label="Después del horno a 220 °C" note="El gas se expande, la miga se fija y la superficie se dora.">una hogaza con miga fija y corteza dorada</value>
</trace>

Cada uno de esos pasos tiene un nombre y una química.

<concept term="Hidratación" ref="source.md#Ejemplo ancla: una hogaza de 500 g de harina">
<define>El agua dividida entre la harina, en porcentaje.</define>
<analogy>Cuánta leche le pones a los cereales: decide si quedan secos o empapados.</analogy>
<example>325 g de agua para 500 g de harina: 325 / 500 = 65 %.</example>
</concept>

<concept term="Gluten" ref="source.md#Paso 1: amasar y formar el gluten">
<define>La red elástica que forman dos proteínas del trigo, la gliadina y la glutenina, al mezclarse con agua. Amasar la estira y la ordena.</define>
<analogy>Una malla de globos: atrapa el gas y deja que la masa se hinche sin romperse.</analogy>
</concept>

<concept term="Fermentación" ref="source.md#Paso 2: fermentar">
<define>La levadura (*Saccharomyces cerevisiae*, hongos microscópicos) se come los azúcares de la harina y produce alcohol (etanol) y dióxido de carbono (CO2).</define>
<analogy>Una fábrica diminuta que convierte azúcar en burbujas.</analogy>
<formula>C_6H_{12}O_6 \rightarrow 2\,C_2H_5OH + 2\,CO_2</formula>
<example>El CO2 queda atrapado en el gluten, como el aire en un globo, y la masa sube; el alcohol da aroma.</example>
</concept>

La levadura trabaja bien entre 25 y 35 °C. Por encima de unos 60 °C muere. El frío la vuelve lenta: la masa en la nevera fermenta despacio y desarrolla más sabor.

<concept term="Reacción de Maillard" ref="source.md#Paso 3: hornear">
<define>Por encima de 140 °C, los azúcares y los aminoácidos de la superficie reaccionan y producen color marrón y cientos de aromas.</define>
<analogy>Lo que dora un filete en la sartén.</analogy>
</concept>

<timeline id="horno" title="En el horno a 220 °C pasan cuatro cosas, en orden" arc="answer" ref="source.md#Paso 3: hornear">
<event label="Salto de horno">El calor expande las burbujas de gas y la masa crece un poco más, hasta que la levadura muere a unos 60 °C.</event>
<event label="El almidón se gelatiniza">El almidón absorbe agua y se hincha: fija la miga.</event>
<event label="Las proteínas coagulan">El gluten se endurece y la forma queda fija.</event>
<event label="La corteza se dora" when="más de 140 °C">La reacción de Maillard da el color marrón y los aromas.</event>
</timeline>

<compare id="activa" title="La levadura trabaja antes del horno; el calor solo expande su gas" a="Lo que se suele pensar" b="Lo que pasa" ref="source.md#Error frecuente" arc="contrast">
<pair label="Cuándo trabaja la levadura" a="se activa con el calor del horno" b="durante la fermentación, antes de hornear" winner="b" />
<pair label="Qué hace el calor del horno" a="despierta a la levadura" b="expande el gas que ya hay y mata a la levadura a unos 60 °C" winner="b" />
<pair label="Por qué sube el pan" a="por el calor" b="por el CO2 atrapado en el gluten" winner="b" />
</compare>

**Por qué el pan se pone duro.** Con el tiempo, el almidón de la miga expulsa agua y se endurece (se retrograda). Un pan duro puede ablandarse un momento calentándolo.

<quiz id="nevera" question="Dejas la masa de la hogaza toda la noche en la nevera en vez de dos horas en la cocina. ¿Qué pasa?">
<option correct="true" why="El frío vuelve lenta a la levadura, que sigue fermentando despacio y da tiempo a que se desarrollen más aromas.">Fermenta despacio y el pan sabe más</option>
<option why="El frío no la mata: la levadura muere por encima de unos 60 °C.">La levadura muere y la masa no sube</option>
<option why="En la nevera la levadura trabaja más lenta, no más rápido.">Sube el doble de rápido</option>
</quiz>
