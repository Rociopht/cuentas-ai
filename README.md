# Cuentas Claras

MASTER PROMPT PARA LOVABLE — CUENTAS AI

0. ROL QUE DEBES ASUMIR

Actúa simultáneamente como:

Senior Product Manager especializado en B2C SaaS.

Principal Product Designer especializado en productos financieros y property management.

Senior Full-Stack Engineer experto en React, TypeScript, Supabase y aplicaciones responsive.

Product Architect especializado en sistemas de gestión de inmuebles.

UX Designer especializado en usuarios no técnicos.

No construyas un mockup superficial.

CONSTRUYE UNA PLATAFORMA FUNCIONAL, ROBUSTA, RESPONSIVE Y ESCALABLE.

No quiero una landing page.

No quiero una pantalla bonita con datos ficticios estáticos.

No quiero un dashboard genérico SaaS.

Quiero una aplicación funcional de gestión de inmuebles y control financiero para propietarios independientes.

El producto se llama:

CUENTAS AI

1. VISIÓN DEL PRODUCTO

CUENTAS AI es una plataforma B2C para propietarios independientes que gestionan sus propios alquileres sin depender de un administrador externo.

La plataforma permite administrar:

Propiedades.

Unidades.

Inquilinos.

Contratos.

Cobros.

Pagos.

Pagos parciales.

Pagos adelantados.

Gastos.

Documentos y comprobantes.

Rentabilidad.

Historial financiero.

Alertas operativas.

Insights generados por IA.

PROPUESTA DE VALOR

CUENTAS AI te ayuda a saber exactamente qué está pasando con tus alquileres, cuánto dinero deberías haber cobrado, cuánto realmente cobraste, quién te debe y cuánto estás ganando.

El propietario no debería tener que revisar WhatsApp, buscar capturas de Yape, revisar bancos y hacer cálculos manuales para entender su negocio.

CUENTAS AI debe convertirse en:

La fuente única de verdad para la gestión de sus alquileres.

2. CONTEXTO REAL DEL PROBLEMA

El usuario principal es un propietario independiente.

El caso de referencia es Rentas Oxa / Inés, pero CUENTAS AI NO DEBE SER UN PRODUCTO HARD-CODED PARA RENTAS OXA.

La arquitectura debe ser genérica y reusable para otros propietarios.

Rentas Oxa es únicamente un caso de referencia y validación del producto.

CONTEXTO DEL USUARIO

El usuario principal:

Administra sus propios inmuebles.

No quiere pagar comisiones innecesarias a terceros.

No es necesariamente técnico.

Gestiona sus alquileres principalmente desde el celular.

Puede tener múltiples propiedades y unidades.

Puede tener contratos diferentes por unidad.

Puede tener rentas de larga duración.

Puede tener cambios de renta, descuentos o acuerdos especiales.

DOLOR PRINCIPAL

El flujo actual es manual:

WhatsApp → captura de Yape/transferencia → revisar banco o Yape → pedir comprobante → intentar identificar quién pagó → recordar quién falta → cuadrar el dinero.

El mayor dolor operativo es:

Revisar quién pagó y cuadrar el dinero.

PROBLEMAS PRIORITARIOS

Prioridad 1:

No saber quién debe.

No saber si una unidad realmente es rentable.

Prioridad 2:

Olvidar cobrar.

Prioridad 3:

No saber cuánto dinero debería haber cobrado.

Prioridad 4:

No saber cuánto realmente ganó.

Prioridad 5:

No saber cuánto gastó cada propiedad.

NO TRATES ESTOS PROBLEMAS COMO FEATURES AISLADAS.

La experiencia debe estar diseñada para resolverlos como un flujo conectado.

3. PRINCIPIO CENTRAL DEL PRODUCTO

CUENTAS AI debe responder rápidamente estas preguntas:

¿Cuánto debería haber cobrado este mes?

¿Cuánto cobré realmente?

¿Quién todavía me debe?

¿Qué pagos todavía tengo que revisar?

¿Cuánto gasté?

¿Cuánto dinero me dejaron mis alquileres?

¿Qué propiedad o unidad está funcionando mejor?

¿Qué debería revisar hoy?

4. PRINCIPIO DE DISEÑO MÁS IMPORTANTE

EL PROPIETARIO DECIDE.

CUENTAS AI:

Detecta.

Organiza.

Calcula.

Sugiere.

Explica.

Pero no debe ejecutar acciones financieras irreversibles automáticamente sin confirmación del propietario.

Ejemplos:

No marcar pagos como confirmados automáticamente.

No modificar rentas automáticamente.

No eliminar información financiera.

No enviar comunicaciones automáticamente.

No cambiar contratos automáticamente.

Toda acción importante debe tener:

Confirmar.

Cancelar.

Editar.

Revisar.

La IA debe ser copiloto, no un robot que toma control del negocio.

5. USUARIO Y ARQUITECTURA DE CUENTAS

Diseña la plataforma pensando principalmente en:

OWNER / PROPIETARIO

El propietario es el usuario principal.

En el futuro puede existir:

Administrador.

Contador.

Colaborador.

Pero no desarrolles roles complejos en esta primera versión.

La arquitectura debe estar preparada para múltiples usuarios y propiedades en el futuro.

6. JERARQUÍA DEL SISTEMA

La estructura conceptual debe ser:

PROPIETARIO
↓
PROPIEDAD
↓
UNIDAD
↓
INQUILINO
↓
CONTRATO
↓
COBROS
↓
PAGOS

Y en paralelo:

PROPIEDAD
↓
GASTOS

La propiedad es el centro operativo.

Una propiedad puede tener múltiples unidades.

Una unidad puede tener múltiples inquilinos a lo largo del tiempo.

El historial de inquilinos debe conservarse.

7. NAVEGACIÓN PRINCIPAL

Crea una navegación clara, moderna y responsive.

DESKTOP

Sidebar vertical:

Inicio

Propiedades

Cobros

Pagos por revisar

Gastos

Rentabilidad

IA / Cuentas AI

Actividad

Abajo:

Ayuda

Configuración

Perfil del propietario

MOBILE

Usa bottom navigation con máximo 5 elementos visibles:

Inicio

Propiedades

Cobros

Pagos

Más

Dentro de "Más":

Gastos.

Rentabilidad.

Cuentas AI.

Actividad.

Configuración.

NO USES UN HAMBURGER COMO ÚNICA NAVEGACIÓN PRINCIPAL.

La app debe sentirse como una aplicación de consumo.

8. HOME / DASHBOARD PRINCIPAL

Esta es la pantalla más importante.

No construyas un dashboard corporativo.

No uses 10 gráficos.

El Home debe responder visualmente:

¿Cómo están mis alquileres hoy?

ESTRUCTURA DEL HOME

HEADER

Mostrar:

"Buenos días, [Nombre]"

Debajo:

"Esto es lo importante de tus alquileres hoy."

Selector de periodo:

Este mes.

Mes anterior.

Personalizado.

BLOQUE 1 — RESUMEN FINANCIERO

Crear una tarjeta principal visualmente dominante:

RESULTADO DEL MES

Mostrar:

S/ 1,150

Texto:

"Resultado de caja"

Cálculo:

Ingresos cobrados - gastos pagados.

Debajo mostrar claramente:

Ingresos esperados: S/ 2,400

Ingresos cobrados: S/ 2,050

Pendiente: S/ 350

Gastos pagados: S/ 900

NO HAGAS ESTOS DATOS COMO 4 TARJETAS AISLADAS SIN JERARQUÍA.

Diseña una composición visual clara.

BLOQUE 2 — ESTADO DE LA GESTIÓN

Mostrar:

Cobros pendientes.

Pagos por revisar.

Contratos próximos a vencer.

Unidades con atraso.

Ejemplo:

"3 cosas requieren tu atención"

Cada item debe ser clickeable.

BLOQUE 3 — INSIGHT DE CUENTAS AI

Mostrar una tarjeta destacada:

"Este mes estás S/350 por debajo de lo esperado."

O:

"Tienes 3 pagos pendientes de revisar."

O:

"La Habitación 3 lleva 8 días de atraso."

O:

"Tus gastos aumentaron 18% este mes."

La IA debe mostrar un insight prioritario, no 20 recomendaciones.

Agregar acción:

"Ver análisis"

BLOQUE 4 — PROPIEDADES

Mostrar cards de propiedades.

Cada card debe mostrar:

Nombre.

Número de unidades.

Ocupación.

Ingresos cobrados.

Pendiente.

Resultado del periodo.

Ejemplo:

"Rentas Oxa"

14 unidades

S/2,050 cobrados

S/350 pendiente

Resultado: S/1,150

BLOQUE 5 — ACCIONES RÁPIDAS

Botones grandes:

Registrar pago.

Registrar gasto.

Agregar unidad.

Revisar pagos.

9. MÓDULO PROPIEDADES

Crear una pantalla de gestión de propiedades.

VISTA GENERAL

Mostrar propiedades como cards visuales.

Cada propiedad debe mostrar:

Nombre.

Dirección.

Tipo de propiedad.

Número de unidades.

Ocupación.

Ingresos esperados.

Ingresos cobrados.

Pendiente.

Resultado de caja.

FILTROS

Todas.

Activas.

Con pendientes.

Con alertas.

BOTÓN

"+ Agregar propiedad"

10. DETALLE DE PROPIEDAD

Al entrar a una propiedad, mostrar:

HEADER

Nombre de la propiedad.

Dirección.

Botón de editar.

TABS

Resumen

Unidades

Cobros

Gastos

Rentabilidad

Documentos

RESUMEN

Mostrar:

Ingresos esperados.

Ingresos cobrados.

Pendiente.

Gastos.

Resultado de caja.

UNIDADES

Mostrar cards o tabla responsive.

Cada unidad debe mostrar:

Nombre.

Tipo.

Inquilino actual.

Estado.

Renta.

Días de atraso.

11. MÓDULO DE UNIDADES

Una unidad puede ser:

Habitación.

Departamento.

Local.

Otro.

FICHA COMPLETA DE UNIDAD

Crear una página detallada.

Ejemplo:

Habitación 3

Mostrar:

Estado de ocupación.

Inquilino actual.

Renta actual.

Próximo vencimiento.

Estado de pago.

Resultado de la unidad.

TABS

Resumen

Cobros

Pagos

Gastos

Historial

Contrato

RESUMEN

Mostrar:

Ingreso esperado.

Ingreso cobrado.

Pendiente.

Gastos asociados.

Resultado de caja.

HISTORIAL

Mostrar historial de inquilinos.

Cuando un inquilino se va:

No borrar el registro.

Crear registro histórico.

Mantener pagos y contratos asociados.

12. MÓDULO DE INQUILINOS

Crear un módulo de inquilinos.

Cada inquilino debe tener:

Nombre completo.

Documento opcional.

Teléfono.

Email opcional.

Historial de unidades.

Historial de contratos.

Historial de pagos.

Historial de atrasos.

PERFIL DEL INQUILINO

Mostrar:

Unidad actual.

Estado de cuenta.

Pagos históricos.

Atrasos.

Pagos parciales.

Crear un indicador:

"Historial de pagos"

Con estados:

Puntual.

Ocasionalmente atrasado.

Recurrentemente atrasado.

Este indicador debe basarse en datos reales.

13. MÓDULO DE CONTRATOS

Los contratos son diferentes por unidad.

CUENTAS AI debe almacenar la información contractual.

DATOS DEL CONTRATO

Unidad.

Inquilino.

Fecha de inicio.

Fecha de vencimiento.

Renta pactada.

Depósito.

Garantía.

Condiciones especiales.

Estado.

Documento adjunto opcional.

ALERTAS

Mostrar:

Contrato por vencer.

Contrato vencido.

Depósito pendiente.

Garantía pendiente.

Crear alertas como:

"El contrato de Habitación 3 vence en 30 días."

No inventar información.

14. MÓDULO DE COBROS

Los cobros son obligaciones de pago.

GENERACIÓN AUTOMÁTICA

El sistema debe generar automáticamente los cobros mensuales según:

Unidad.

Contrato activo.

Renta vigente.

Fecha de vencimiento.

No hardcodear el día 1.

El sistema debe permitir definir el día de vencimiento por unidad o contrato.

CAMBIOS DE RENTA

La renta puede cambiar ocasionalmente.

Debe existir historial de renta.

Ejemplo:

S/300 desde enero.

S/350 desde julio.

Nunca sobrescribas la historia.

ESTADOS DE COBRO

Pendiente.

Parcial.

Pagado.

Pagado por adelantado.

Vencido.

Disputado.

PAGOS PARCIALES

Ejemplo:

Renta: S/500.

Pago: S/300.

Mostrar:

Pagado: S/300.

Pendiente: S/200.

El cobro continúa abierto.

PAGOS ADELANTADOS

Si el inquilino paga meses futuros:

El sistema debe permitir asignar el pago a:

Mes actual.

Meses futuros.

Mostrar claramente:

"Pago adelantado"

No mezclarlo con ingresos de meses anteriores.

15. MÓDULO DE PAGOS POR REVISAR

Este módulo es una de las funcionalidades más importantes de CUENTAS AI.

Debe resolver el problema real:

"Revisar quién pagó y cuadrar el dinero."

PANTALLA "PAGOS POR REVISAR"

Mostrar:

Pagos pendientes de confirmación.

Pagos con comprobante.

Pagos sin unidad identificada.

Pagos parciales.

Pagos que no coinciden con el cobro esperado.

REGISTRO DE PAGO

Permitir:

Registrar pago manualmente.

Monto.

Fecha.

Medio de pago.

Adjuntar comprobante.

Medios:

Yape.

Transferencia.

Efectivo.

Otro.

FLUJO DE CONFIRMACIÓN

Cuando el propietario registra un pago:

Capturar monto.

Capturar fecha.

Adjuntar comprobante opcional.

Sugerir unidad o inquilino.

Mostrar coincidencia.

El propietario confirma.

Nunca confirmes un pago crítico sin confirmación humana.

DISEÑO

Esta pantalla debe sentirse como una bandeja de revisión rápida.

Cada item debe tener:

Monto.

Fecha.

Posible inquilino.

Posible unidad.

Estado.

Acción "Confirmar".

16. MÓDULO DE GASTOS

Crear un módulo completo de gastos.

CATEGORÍAS INICIALES

Agua.

Luz.

Internet.

Mantenimiento.

Reparaciones.

Otros.

REGISTRO

Permitir:

Categoría.

Monto.

Fecha.

Descripción.

Comprobante/foto.

Propiedad.

Unidad opcional.

TIPOS DE GASTO

PROPIEDAD

Gasto de toda la propiedad.

Ejemplo:

Luz general.

UNIDAD

Gasto asociado a una unidad específica.

Ejemplo:

Reparación de Habitación 3.

COMPARTIDO

Preparar arquitectura para gastos compartidos y prorrateo futuro.

No calcules prorrateos arbitrarios sin una regla definida por el propietario.

GASTOS RECURRENTES

Permitir marcar un gasto como recurrente.

Ejemplo:

Agua.

Luz.

Internet.

El sistema debe permitir generar recordatorios o sugerencias.

17. MÓDULO DE RENTABILIDAD

Crear una pantalla de análisis financiero.

DEFINICIÓN OFICIAL DE RESULTADO

En esta versión:

Resultado de caja = ingresos cobrados - gastos pagados.

No uses ingresos esperados para calcular la ganancia real.

MÉTRICAS

Mostrar:

Ingresos esperados.

Ingresos cobrados.

Pendiente.

Gastos pagados.

Resultado de caja.

ANÁLISIS POR PROPIEDAD

Mostrar ranking:

Propiedad con mejor resultado.

Propiedad con mayor pendiente.

Propiedad con mayor variación de gastos.

ANÁLISIS POR UNIDAD

Mostrar:

Ingreso cobrado.

Gastos asociados.

Resultado de caja.

Crear visualización clara.

No uses gráficos complejos.

Prioriza:

barras simples,

comparaciones,

variaciones,

rankings.

18. CUENTAS AI — INTELIGENCIA DEL PRODUCTO

CUENTAS AI debe tener una personalidad visible, profesional y útil.

No uses avatar infantil.

No uses robot caricaturesco.

La IA debe sentirse como:

un copiloto financiero inteligente para el propietario.

INSIGHTS

La IA puede detectar:

Ingresos por debajo de lo esperado.

Aumentos relevantes de gastos.

Atrasos recurrentes.

Unidades con patrones de atraso.

Propiedades con bajo resultado.

Variaciones relevantes.

EJEMPLOS

"Este mes vas S/400 por debajo de lo esperado."

"La Habitación 3 lleva 8 días de atraso."

"Tus gastos aumentaron 20% respecto al mes anterior."

"La propiedad generó S/1,200 de resultado de caja."

REGLA

No generar insights genéricos.

No decir:

"Todo parece bien."

Los insights deben estar basados en datos reales.

19. CHAT CON CUENTAS AI

Crear una experiencia de consulta en lenguaje natural.

El usuario puede preguntar:

"¿Cuánto cobré este mes?"

"¿Quién me debe?"

"¿Cuál fue mi mejor unidad?"

"¿Cuánto gasté en luz en los últimos 3 meses?"

"¿Qué propiedad está funcionando mejor?"

La IA debe:

Interpretar la pregunta.

Consultar datos reales de Supabase.

Responder con cifras reales.

Explicar el cálculo brevemente.

Mostrar links o acciones hacia el dato relacionado.

Ejemplo:

Usuario:

"¿Quién me debe?"

Respuesta:

"Actualmente tienes 3 cobros pendientes por un total de S/850.

Habitación 3 — S/350 — 8 días de atraso.

Depa 2B — S/300 — 3 días de atraso.

Local 1 — S/200 — pendiente.

¿Quieres revisar los pagos pendientes?"

Agregar botón:

"Revisar pagos"

NO INVENTAR DATOS.

Si no hay suficiente información:

"No tengo suficiente información registrada para calcularlo."

20. SISTEMA DE ALERTAS

Crear un centro de alertas.

Tipos:

Cobro vencido.

Pago pendiente de revisión.

Contrato por vencer.

Gasto anormal.

Resultado inferior al esperado.

Las alertas deben tener:

Prioridad.

Fecha.

Contexto.

Acción.

No saturar al usuario.

Máximo mostrar las alertas más relevantes.

21. ACTIVIDAD / TRAZABILIDAD

Crear una pantalla de actividad.

Registrar:

Cobro creado.

Pago registrado.

Pago confirmado.

Gasto registrado.

Contrato creado.

Renta modificada.

Insight generado.

Acción de IA.

Mostrar:

"Hoy"

"Ayer"

"Esta semana"

Cada actividad debe tener:

Acción.

Fecha.

Entidad relacionada.

Usuario o IA que la originó.

La trazabilidad es importante.

22. MODELO DE DATOS EN SUPABASE

Implementa un modelo de datos real y escalable.

profiles

id uuid primary key

full_name

email

avatar_url

created_at

properties

id uuid primary key

owner_id uuid

name

property_type

address

city

status

created_at

updated_at

units

id uuid primary key

property_id uuid

name

unit_type

status

created_at

updated_at

tenants

id uuid primary key

owner_id uuid

full_name

document_number nullable

phone nullable

email nullable

created_at

updated_at

tenant_unit_history

id uuid primary key

tenant_id uuid

unit_id uuid

start_date

end_date nullable

status

contracts

id uuid primary key

unit_id uuid

tenant_id uuid

start_date

end_date

rent_amount

deposit_amount nullable

guarantee_amount nullable

special_conditions nullable

status

document_url nullable

created_at

updated_at

rent_history

id uuid primary key

unit_id uuid

contract_id uuid nullable

amount

effective_from

effective_to nullable

reason nullable

charges

id uuid primary key

unit_id uuid

contract_id uuid nullable

concept

period_month

period_year

amount_expected

due_date

status

created_at

updated_at

payments

id uuid primary key

owner_id uuid

amount

payment_date

payment_method

proof_url nullable

status

notes nullable

created_at

updated_at

payment_allocations

id uuid primary key

payment_id uuid

charge_id uuid

amount_allocated

created_at

Esto permite:

pagos parciales,

pagos adelantados,

un pago aplicado a varios cobros.

expenses

id uuid primary key

property_id uuid

unit_id uuid nullable

category

amount

expense_date

description

receipt_url nullable

recurrence_type nullable

created_at

updated_at

ai_insights

id uuid primary key

owner_id uuid

insight_type

title

message

severity

related_entity_type nullable

related_entity_id nullable

status

created_at

ai_conversations

id uuid primary key

owner_id uuid

created_at

ai_messages

id uuid primary key

conversation_id uuid

role

content

created_at

activity_log

id uuid primary key

owner_id uuid

action_type

entity_type

entity_id nullable

description

metadata jsonb

created_at

23. REGLAS DE NEGOCIO

Implementa estas reglas en backend y no solamente en frontend.

RESULTADO DE CAJA

Ingresos cobrados - gastos pagados.

PENDIENTE

Ingresos esperados - monto efectivamente asignado a cobros.

ESTADO DE COBRO

Pagado si amount_allocated >= amount_expected.

Parcial si amount_allocated > 0 y amount_allocated < amount_expected.

Pendiente si amount_allocated = 0 y no venció.

Vencido si amount_allocated < amount_expected y due_date < today.

PAGOS ADELANTADOS

Un pago puede asignarse a periodos futuros.

No mezclar automáticamente ingresos futuros con periodos anteriores.

HISTORIAL DE RENTAS

Nunca sobrescribir la renta anterior.

HISTORIAL DE INQUILINOS

Nunca eliminar un inquilino anterior de una unidad.

GASTOS

Un gasto puede pertenecer a:

Propiedad.

Unidad.

24. DATOS DEMO

Crea datos demo realistas para que la aplicación se vea completa desde el primer render.

NO USES LOREM IPSUM.

NO USES "John Doe".

NO USES DATOS GENÉRICOS DE PLANTILLA.

Crea:

3 propiedades demo.

Entre 5 y 15 unidades por propiedad.

Habitaciones.

Departamentos.

Al menos 1 local comercial.

Diferentes montos de renta.

Contratos con distintas fechas.

Inquilinos con nombres realistas.

Pagos completos.

Pagos parciales.

Pagos adelantados.

Cobros vencidos.

Gastos de agua, luz, internet, mantenimiento y reparaciones.

Diferentes resultados de caja.

Los datos demo deben permitir ver:

Dashboard con información real.

Pagos por revisar.

Rentabilidad.

Alertas.

Contratos próximos a vencer.

NO USES LOS NÚMEROS EXACTOS DE RENTAS OXA COMO ÚNICO DATASET.

25. DISEÑO VISUAL

El estilo debe inspirarse en:

Airbnb.

Booking.

Aplicaciones B2C premium.

Productos financieros modernos.

NO QUIERO:

Azul corporativo genérico.

Púrpura SaaS genérico.

Dashboard tipo ERP.

Pantallas llenas de tablas.

20 cards pequeñas.

Visuales de IA cliché.

Robots.

Gradientes excesivos.

DIRECCIÓN VISUAL

CUENTAS AI debe sentirse:

Cálido.

Premium.

Claro.

Humano.

Confiable.

Moderno.

Usa una paleta basada en:

Neutros cálidos.

Blanco roto.

Gris suave.

Acentos terracota, ocre o verde tierra.

Usa tipografía sans-serif moderna y altamente legible.

Bordes redondeados moderados.

Mucho espacio en blanco.

Jerarquía visual fuerte.

IMPORTANTE

No copies visualmente Airbnb.

Toma únicamente la claridad y la sensación B2C.

CUENTAS AI debe tener identidad propia.

26. RESPONSIVE — NO NEGOCIABLE

La aplicación debe ser completamente responsive.

MOBILE

Diseñar primero para:

360px.

390px.

430px.

El propietario gestiona desde el celular.

Priorizar:

botones grandes,

tap targets cómodos,

cards,

bottom navigation,

formularios simples,

lectura rápida.

TABLET

Optimizar para:

768px.

1024px.

DESKTOP

Optimizar para:

1280px.

1440px.

En desktop:

sidebar,

contenido centrado,

layout de 2 columnas cuando tenga sentido.

TABLAS

Nunca fuerces una tabla ancha en mobile.

Convertir tablas en:

cards,

listas,

acordeones,

bloques de información.

27. ESTADOS DE LA APLICACIÓN

Implementa correctamente:

Loading.

Empty state.

Error state.

Success state.

Skeleton loading.

EMPTY STATES

Ejemplo:

"No tienes propiedades todavía."

CTA:

"Agregar mi primera propiedad"

SIN PENDIENTES

Mostrar:

"Todo está al día"

No mostrar una tabla vacía.

ERROR

Mostrar mensajes humanos.

Nunca:

"Something went wrong."

28. ARQUITECTURA TÉCNICA

Usa:

React.

TypeScript.

Supabase.

Componentes reutilizables.

React Query o equivalente para data fetching.

Validación de formularios.

Arquitectura modular.

Separar componentes:

Dashboard.

PropertyCard.

UnitCard.

ChargeStatusBadge.

PaymentReviewCard.

ExpenseCard.

InsightCard.

ContractAlert.

AIChat.

No crear una página monolítica.

SEGURIDAD

Implementa Row Level Security.

El propietario solo puede acceder a sus propios datos.

No hardcodear API keys.

29. IA

La IA debe ejecutarse en backend o Edge Functions.

Nunca exponer API keys en frontend.

Crear una capa de abstracción para el proveedor de IA.

La IA debe recibir datos estructurados.

No permitir que la IA invente cifras.

Para preguntas financieras:

consultar primero Supabase,

calcular datos,

luego generar respuesta.

La IA no debe calcular datos financieros basándose solamente en texto.

30. CRITERIO DE ÉXITO DEL PRODUCTO

Considera que el producto está bien construido únicamente si una propietaria puede:

Crear una propiedad.

Crear unidades.

Registrar un inquilino.

Crear un contrato.

Definir una renta.

Generar cobros mensuales.

Registrar un pago.

Adjuntar comprobante.

Aplicar un pago parcial.

Registrar un pago adelantado.

Ver quién debe.

Registrar un gasto.

Ver el resultado de caja.

Ver la rentabilidad por propiedad.

Revisar alertas.

Preguntar a CUENTAS AI cuánto cobró.

Entender qué debe hacer hoy.

Todo esto debe poder realizarse sin conocimientos técnicos.

31. REGLA FINAL

Antes de generar cada pantalla, pregúntate:

¿Esto ayuda al propietario a entender mejor su dinero o a gestionar mejor sus alquileres?

Si la respuesta es no:

NO AGREGUES LA FEATURE.

No construyas una plataforma llena de funcionalidades.

Construye una plataforma profunda, conectada y útil.

CUENTAS AI no debe sentirse como un ERP.

Debe sentirse como:

Una app moderna que finalmente le dice al propietario qué está pasando con sus alquileres.

COMIENZA IMPLEMENTANDO LA APLICACIÓN FUNCIONAL COMPLETA.

NO GENERES UNA LANDING PAGE.

NO GENERES UN MOCKUP ESTÁTICO.

NO USES DATOS PLACEHOLDER.

IMPLEMENTA LA BASE DE DATOS, LAS RELACIONES, LOS CRUD, LOS FLUJOS, LOS ESTADOS Y LA EXPERIENCIA RESPONSIVE.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://suite-sense-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cc19a95c-e32e-44f6-9c8e-4d57e40654ed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
