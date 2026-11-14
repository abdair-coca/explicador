# ¿Dónde pierde clientes una tienda, y qué etapa conviene mejorar?

<brief form="quantity">
<audience>Personas de un pequeño negocio que nunca han analizado sus ventas por etapas</audience>
<question>¿Dónde pierde clientes la tienda en octubre, y qué etapa conviene mejorar primero?</question>
<example>En octubre, 10 000 visitas a la web terminan en 60 ventas de 500 €</example>
<misconception>Creer que basta con mirar las ventas del mes para saber qué mejorar</misconception>
<check>Predecir cuántas ventas habría si las demos pasaran del 50 % al 60 % de propuestas</check>
<terms>embudo de ventas, tasa de conversión, cuello de botella, costo de adquisición de cliente</terms>
</brief>

<theme name="business data" />

Una tienda de software vende una licencia de 500 €. En octubre, **10 000 personas** visitan su web y **60** compran. Entre una cifra y otra hay cuatro pasos (cifras de ejemplo).

<chart id="octubre" title="De 10 000 visitas quedan 60 ventas" arc="example" type="hbars" ref="source.md#Las etapas del mes de octubre">
<row label="1. Visitas a la web" values="10000" />
<row label="2. Registros" values="1200" />
<row label="3. Demos" values="480" />
<row label="4. Propuestas" values="240" />
<row label="5. Ventas" values="60" />
</chart>

En cada paso solo una parte de las personas sigue; el resto se pierde. Ese camino tiene nombre.

<concept term="Embudo de ventas" ref="source.md#Embudo de ventas de una tienda de software (cifras de ejemplo)">
<define>El camino de las personas desde que conocen un producto hasta que lo compran, etapa por etapa, con menos gente en cada una.</define>
<analogy>Un embudo de cocina: entra mucho por arriba y sale un hilo por abajo.</analogy>
<example>Visitas, registros, demos, propuestas y ventas: 10 000, 1 200, 480, 240 y 60.</example>
</concept>

<concept term="Tasa de conversión" ref="source.md#Tasa de conversión">
<define>El porcentaje de una etapa que pasa a la siguiente. La conversión total es el porcentaje de visitas que terminan comprando.</define>
<analogy>La nota de corte de cada examen: solo los que la pasan siguen al siguiente curso.</analogy>
<example>De 1 200 registros, 480 piden una demo: 40 %. Conversión total: 60 / 10 000 = 0,6 %.</example>
</concept>

<concept term="Cuello de botella" ref="source.md#Cuello de botella">
<define>La etapa con la menor tasa de conversión: la que más gente pierde en proporción.</define>
<analogy>El tramo más estrecho de una carretera: decide cuántos coches pasan.</analogy>
</concept>

<chart id="tasas" title="El registro es el cuello de botella: solo pasa el 12 %" arc="answer" type="bars" unit="%" highlight="Visitas → registros" ref="source.md#Cuello de botella">
<row label="Visitas → registros" values="12" />
<row label="Registros → demos" values="40" />
<row label="Demos → propuestas" values="50" />
<row label="Propuestas → ventas" values="25" />
</chart>

Mejorar una etapa débil suele rendir más que mejorar una fuerte. Y como las etapas se multiplican, mejorar cualquiera mejora el final en la misma proporción.

<derive id="mejora" title="Si las propuestas convierten al 30 %, 60 ventas pasan a 72" arc="apply" ref="source.md#Qué pasa si una etapa mejora">
<line note="Hoy: el 25 % de las 240 propuestas compra.">240 \cdot 0{,}25 = 60</line>
<line note="Si esa etapa sube al 30 %.">240 \cdot 0{,}30 = 72</line>
</derive>

Si las visitas se duplican a 20 000 con los mismos porcentajes, las ventas también se duplican: 120.

<concept term="Costo de adquisición de cliente (CAC)" ref="source.md#Dinero">
<define>Lo que se gasta en marketing dividido entre las ventas: cuánto cuesta atraer a cada cliente.</define>
<analogy>Lo que cuesta el cebo por cada pez que se pesca.</analogy>
<example>6 000 € de marketing entre 60 ventas: 100 € por cliente.</example>
</concept>

<stats id="dinero" title="Cada cliente deja 400 € más de lo que costó atraerlo" arc="apply">
<stat value="30 000 €" label="ingresos de octubre: 60 ventas de 500 €" ref="source.md#Dinero" />
<stat value="100 €" label="CAC: 6 000 € de marketing entre 60 ventas" ref="source.md#Dinero" />
<stat value="400 €" label="deja cada cliente por encima de lo que costó" ref="source.md#Dinero" />
</stats>

<compare id="mirar" title="Las ventas no dicen qué mejorar; las etapas sí" a="Mirar solo las ventas del mes" b="Mirar cada etapa" ref="source.md#Error frecuente" arc="contrast">
<pair label="Qué se ve en octubre" a="60 ventas" b="dónde se perdió la gente: el 88 % de las visitas no se registra" winner="b" />
<pair label="Dos meses con 60 ventas" a="parecen iguales" b="pueden tener cuellos de botella distintos" winner="b" />
<pair label="Qué mejorar" a="no basta para saberlo" b="la etapa más débil, que hoy es el registro" winner="b" />
</compare>

<quiz id="demos" question="Si las demos pasaran a dar propuestas al 60 % en vez del 50 %, con todo lo demás igual, ¿cuántas ventas habría en octubre?">
<option why="Mejorar una etapa intermedia también cambia el final: las etapas se multiplican.">60, las ventas no cambian</option>
<option correct="true" why="480 demos al 60 % dan 288 propuestas, y el 25 % de 288 son 72 ventas.">72</option>
<option why="Eso sería si el 60 % se aplicara a las 240 propuestas actuales.">144</option>
</quiz>
