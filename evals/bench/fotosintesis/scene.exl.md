# ¿Cómo fabrica una hoja su alimento con luz, agua y aire?

<brief form="process">
<audience>Estudiantes de secundaria de 14 a 15 años</audience>
<question>¿Cómo fabrica una hoja su alimento con luz, agua y CO2, y de dónde sale el oxígeno?</question>
<example>Una hoja de roble de 20 cm² fabrica unos 6 mg de glucosa por hora en un día soleado</example>
<misconception>Creer que el oxígeno que libera la planta sale del CO2</misconception>
<check>Predecir adónde van los átomos de oxígeno del agua que absorbe la hoja</check>
<terms>cloroplasto, clorofila, fase luminosa, ciclo de Calvin, ATP y NADPH</terms>
</brief>

<theme name="nature science" />

Una hoja de roble de **20 cm²**, en un día soleado, fabrica unos **6 mg de glucosa por hora**. Esa glucosa es su alimento: la planta no lo come, lo fabrica.

<trace id="hoja" title="En una hora, gas y agua se convierten en azúcar y oxígeno" arc="example" ref="source.md#Ejemplo ancla: una hoja de un árbol en un día soleado">
<value kind="table" label="Lo que entra en la hoja" note="El agua sube desde las raíces; el CO2 entra del aire por los estomas, unos poros diminutos.">CO2=8,8 mg|agua=3,6 mg|luz=sol</value>
<value kind="table" label="Lo que la hoja fabrica" note="Dentro de las células, la luz activa la fabricación de glucosa.">glucosa=6 mg</value>
<value kind="table" label="Lo que sale de la hoja" note="El oxígeno sale por los mismos estomas por los que entró el CO2.">glucosa=6 mg|oxígeno=6,4 mg</value>
</trace>

Son cifras de ejemplo, coherentes con la ecuación de la fotosíntesis: por cada molécula de glucosa entran 6 de CO2 y 6 de agua, y salen 6 de oxígeno.

$$6\,CO_2 + 6\,H_2O + \text{luz} \rightarrow C_6H_{12}O_6 + 6\,O_2$$

La fotosíntesis la hacen las plantas, las algas y algunas bacterias. En la hoja ocurre en un lugar concreto.

<concept term="Cloroplasto" ref="source.md#Dónde ocurre: el cloroplasto">
<define>La parte de la célula de la hoja donde ocurre la fotosíntesis. Tiene dos zonas: los tilacoides, discos apilados que captan la luz, y el estroma, el líquido que los rodea.</define>
<analogy>Una cocina con dos encimeras: en una se prepara la energía, en la otra se cocina el plato.</analogy>
</concept>

<concept term="Clorofila" ref="source.md#La clorofila y el color verde">
<define>La sustancia de los tilacoides que absorbe la luz, sobre todo la roja y la azul.</define>
<analogy>Una placa solar verde: capta la luz que le sirve y devuelve el resto.</analogy>
<example>La luz verde casi no se absorbe, se refleja: por eso las hojas se ven verdes.</example>
</concept>

<concept term="Fase luminosa" ref="source.md#Fase luminosa (en los tilacoides)">
<define>La primera parte, en los tilacoides: la luz que absorbe la clorofila rompe moléculas de agua, de ahí sale el oxígeno, y la energía de la luz se guarda.</define>
<analogy>Cargar baterías con un panel solar.</analogy>
</concept>

<concept term="ATP y NADPH" ref="source.md#Fase luminosa (en los tilacoides)">
<define>Dos moléculas portadoras que guardan la energía de la luz y la llevan al estroma.</define>
<analogy>Las baterías cargadas que se llevan de una encimera a la otra.</analogy>
</concept>

<concept term="Ciclo de Calvin" ref="source.md#Ciclo de Calvin (en el estroma)">
<define>La segunda parte, en el estroma: usa el ATP y el NADPH para unir el carbono del CO2 y construir glucosa. No necesita luz directamente, pero sí lo que la luz produjo.</define>
<analogy>Montar el plato con la energía de las baterías ya cargadas.</analogy>
</concept>

<journey id="camino" title="La glucosa se fabrica en dos fases dentro del cloroplasto" arc="answer">
<stage id="raices" label="El agua sube" value="3,6 mg" kind="text">El agua sube desde las raíces por el tallo hasta la hoja.</stage>
<stage id="estomas" label="El CO2 entra" value="8,8 mg" kind="text">El CO2 entra desde el aire por los estomas.</stage>
<stage id="luminosa" label="Fase luminosa" value="6,4 mg de O2" kind="split">En los tilacoides, la luz rompe el agua: sale el oxígeno y la energía queda en ATP y NADPH.</stage>
<stage id="calvin" label="Ciclo de Calvin" value="6 mg de glucosa" kind="model">En el estroma, el ATP y el NADPH unen el carbono del CO2 en glucosa.</stage>
<stage id="salida" label="El oxígeno sale" value="6,4 mg" kind="metric">El oxígeno sale por los mismos estomas.</stage>
</journey>

<compare id="origen" title="El oxígeno sale del agua, no del CO2" a="Lo que se suele pensar" b="Lo que pasa en la hoja" ref="source.md#Error frecuente" arc="contrast">
<pair label="De dónde sale el oxígeno que libera la planta" a="del CO2" b="del agua que rompe la luz en la fase luminosa" winner="b" />
<pair label="Adónde va el carbono del CO2" a="sale con el oxígeno" b="termina en la glucosa, en el ciclo de Calvin" winner="b" />
</compare>

**Qué limita la fotosíntesis.** La velocidad depende de la luz, del CO2 y de la temperatura. El factor que más escasea es el que frena todo el proceso: si falta CO2, más luz no acelera nada. Con poca luz, la velocidad crece al aumentar la luz hasta llegar a una meseta.

<quiz id="atomos" question="Si se pudieran seguir los átomos de oxígeno del agua que absorbe la hoja de roble, ¿dónde acabarían?">
<option correct="true" why="La luz rompe el agua en la fase luminosa, y de esa ruptura sale el oxígeno que la hoja libera.">En el oxígeno que sale por los estomas</option>
<option why="El carbono de la glucosa viene del CO2, y el ciclo de Calvin lo une con la energía del ATP y el NADPH.">En la glucosa</option>
<option why="El CO2 entra en la hoja, no sale de ella.">En el CO2</option>
</quiz>
