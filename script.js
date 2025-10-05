// ====================================================================
// CONFIGURACIÓN DE LA API (BACKEND EN RENDER)
// ¡REEMPLAZA ESTA URL con la que Render te asignó!
// ====================================================================
const RENDER_API_URL = "https://mctools-beta-1.onrender.com/api/datos";

// ====================================================================
// PARTE 1: DATOS Y VARIABLES GLOBALES
// ====================================================================

// Datos se llena de forma asíncrona desde la API
let datos = [];

// Elementos del DOM
const tbody = document.querySelector("#tabla tbody");
const seleccionadosDiv = document.getElementById("seleccionados");
const busquedaInput = document.getElementById("busqueda");
const modalGrupo = document.getElementById("modal-grupo");
const inputModalGrupo = document.getElementById("input-modal-grupo");
const nuevoGrupoInput = document.getElementById("nuevo-grupo"); // Asegúrate de que este ID exista en tu HTML

// REFERENCIAS PARA EL TOAST DE NOTIFICACIÓN
const notificacionToast = document.getElementById("notificacion-toast");
const toastMensaje = document.getElementById("toast-mensaje");
const toastIcono = document.getElementById("toast-icono");

// REFERENCIAS PARA MODAL DE CONFIRMACIÓN
const modalConfirmacion = document.getElementById("modal-confirmacion");
const confirmacionTitulo = document.getElementById("confirmacion-titulo");
const confirmacionMensaje = document.getElementById("confirmacion-mensaje");
const btnConfirmar = document.getElementById("btn-confirmar");
const btnCancelar = document.getElementById("btn-cancelar");


// Estado de la Aplicación (Persistente vía localStorage)
let grupoActivo = "Grupo 1";
let grupos = ["Grupo 1", "Grupo 2", "Grupo 3"];
let grupoEditando = null;
let seleccionGeneral = []; // ALMACENA IDs de los elementos
let elementoGrupos = {}; // LAS CLAVES SON IDs, guarda a qué grupos pertenece
let accionConfirmarCallback = () => { };


// FUNCIÓN AUXILIAR: busca un objeto de datos por su ID
function encontrarItemPorId(id) {
    const idNum = Number(id);
    return datos.find(item => item.id === idNum);
}


// ====================================================================
// PARTE 1B: GESTIÓN DE PERSISTENCIA (localStorage)
// ====================================================================

/**
 * Guarda el estado actual de las variables clave en localStorage.
 */
function guardarEstado() {
    try {
        const estado = {
            grupos,
            seleccionGeneral,
            elementoGrupos,
            grupoActivo
        };
        localStorage.setItem('asistenteProgramacionEstado', JSON.stringify(estado));
    } catch (e) {
        console.error("Error al guardar estado:", e);
    }
}

/**
 * Carga el estado guardado en localStorage al iniciar la aplicación.
 */
function cargarEstado() {
    try {
        const estadoGuardado = localStorage.getItem('asistenteProgramacionEstado');
        if (estadoGuardado) {
            const estado = JSON.parse(estadoGuardado);

            grupos = estado.grupos || ["Grupo 1", "Grupo 2", "Grupo 3"];
            seleccionGeneral = estado.seleccionGeneral || [];
            elementoGrupos = estado.elementoGrupos || {};

            if (estado.grupoActivo && grupos.includes(estado.grupoActivo)) {
                grupoActivo = estado.grupoActivo;
            } else {
                grupoActivo = grupos[0];
            }
        }
    } catch (e) {
        console.error("Error al cargar estado. Se usará el estado por defecto.", e);
    }
}


// ====================================================================
// PARTE 2: GESTIÓN DE NOTIFICACIONES Y CONFIRMACIÓN
// ====================================================================

/**
 * Muestra una notificación personalizada interna (Toast).
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    if (!notificacionToast || !toastMensaje || !toastIcono) return;

    toastMensaje.textContent = mensaje;
    let icono;

    switch (tipo) {
        case 'exito':
            icono = '✅';
            break;
        case 'error':
            icono = '❌';
            break;
        case 'info':
        default:
            icono = '💡';
            break;
    }
    toastIcono.textContent = icono;

    notificacionToast.classList.remove('toast-oculto');
    notificacionToast.classList.add('toast-visible');

    setTimeout(() => {
        notificacionToast.classList.remove('toast-visible');
    }, 3500);
}

/**
 * Muestra el modal de confirmación personalizado.
 */
function mostrarConfirmacion(titulo, mensaje, callback) {
    confirmacionTitulo.textContent = titulo;
    confirmacionMensaje.textContent = mensaje;
    accionConfirmarCallback = callback;
    modalConfirmacion.style.display = 'flex';
}

/**
 * Configurar los eventos de clic del modal de confirmación.
 */
function inicializarConfirmacionModal() {
    btnConfirmar.onclick = () => {
        modalConfirmacion.style.display = 'none';
        accionConfirmarCallback();
    };

    btnCancelar.onclick = () => {
        modalConfirmacion.style.display = 'none';
    };
}


// ====================================================================
// PARTE 3: GESTIÓN DE SELECCIÓN (TABLA)
// ====================================================================

/**
 * Añade o quita un elemento de la selección general (Sincronización de selección).
 */
window.alternarSeleccionGeneral = function (id) {
    const itemIdIndex = seleccionGeneral.indexOf(id);
    const idStr = String(id);

    if (itemIdIndex === -1) {
        // Añadir elemento
        seleccionGeneral.push(id);

        if (!elementoGrupos[idStr]) {
            elementoGrupos[idStr] = [grupoActivo];
        }

    } else {
        // Quitar elemento
        seleccionGeneral.splice(itemIdIndex, 1);
        if (elementoGrupos[idStr]) {
            delete elementoGrupos[idStr];
        }
    }

    actualizarVistas();
}


// ====================================================================
// PARTE 4: GESTIÓN DE AGRUPACIÓN (BARRA LATERAL)
// ====================================================================

window.setGrupo = function (nombre) {
    grupoActivo = nombre;
    grupoEditando = null;
    busquedaInput.value = "";
    actualizarVistas();
}

window.crearGrupo = function () {
    const inputElement = document.getElementById("input-modal-grupo") || nuevoGrupoInput;
    const nombre = inputElement.value.trim();
    if (nombre && !grupos.includes(nombre)) {
        grupos.push(nombre);
        inputElement.value = "";
        setGrupo(nombre);
        mostrarNotificacion(`Grupo "${nombre}" creado con éxito.`, 'exito');
    } else if (nombre) {
        mostrarNotificacion("El grupo ya existe.", 'error');
    }
}

window.renombrarGrupo = function (viejo, nuevo) {
    if (!nuevo || grupos.includes(nuevo)) {
        mostrarNotificacion("El nombre es inválido o ya existe.", 'error');
        return;
    }
    grupos = grupos.map(g => g === viejo ? nuevo : g);

    for (const id in elementoGrupos) {
        elementoGrupos[id] = elementoGrupos[id].map(tag => tag === viejo ? nuevo : tag);
    }

    if (grupoActivo === viejo) grupoActivo = nuevo;
    grupoEditando = null;
    actualizarVistas();
    mostrarNotificacion(`Grupo "${viejo}" renombrado a "${nuevo}".`, 'exito');
}

window.eliminarGrupo = function (nombre) {
    if (grupos.length <= 1) {
        mostrarNotificacion("No puedes eliminar el único grupo restante.", 'error');
        return;
    }

    mostrarConfirmacion(
        "Eliminar Grupo",
        `¿Estás seguro de que deseas eliminar permanentemente el grupo "${nombre}"?`,
        () => {
            grupos = grupos.filter(g => g !== nombre);

            for (const id in elementoGrupos) {
                elementoGrupos[id] = elementoGrupos[id].filter(tag => tag !== nombre);
                if (elementoGrupos[id].length === 0) {
                    elementoGrupos[id].push(grupos[0]);
                }
            }

            if (!grupos.includes(grupoActivo)) {
                grupoActivo = grupos[0];
            }

            actualizarVistas();
            mostrarNotificacion(`Grupo "${nombre}" eliminado.`, 'exito');
        }
    );
}

window.reordenarGrupos = function (origen, destino) {
    const i = grupos.indexOf(origen);
    const j = grupos.indexOf(destino);
    if (i !== -1 && j !== -1 && i !== j) {
        const nuevoOrden = [...grupos];
        nuevoOrden.splice(i, 1);
        nuevoOrden.splice(j, 0, origen);
        grupos = nuevoOrden;
        renderGrupos();
        guardarEstado();
    }
}


// ====================================================================
// PARTE 5: RENDERIZADO DE UI Y LÓGICA DE API (Guardado)
// ====================================================================

/**
 * Centraliza la actualización de la UI y guarda el estado.
 */
function actualizarVistas() {
    renderGrupos();
    renderSeleccionados();
    renderTablaBotones();
    guardarEstado();
}

/**
 * Envía los cambios de edición al servidor de Render y actualiza la lista local.
 */
window.guardarEdicionDato = async function (id, campo, nuevoValor) {
    const item = encontrarItemPorId(id);
    nuevoValor = nuevoValor.trim();

    if (!item || item[campo] === nuevoValor) return;

    // Actualizar localmente primero
    item[campo] = nuevoValor;

    try {
        const response = await fetch(`${RENDER_API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campo: campo,
                valor: nuevoValor
            })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: El servidor no pudo guardar el cambio.`);
        }

        // El servidor respondió OK: cambio permanente y sincronizado.
        mostrarNotificacion(`Edición de ${campo} guardada permanentemente.`, 'exito');

    } catch (error) {
        console.error("Error al guardar en el servidor:", error);
        mostrarNotificacion("Error al guardar en la nube. ¡Revisa la conexión!", 'error');
    }
}


/**
 * Inicializa la tabla con los datos de la API. Celdas EDITABLES.
 * ESTA ES LA FUNCIÓN CLAVE QUE DIBUJA LOS DATOS DE LA API EN LA TABLA.
 */
function renderTablaInicial() {
    tbody.innerHTML = "";
    const filtro = busquedaInput.value.toLowerCase();

    // Si no hay datos (porque el fetch falló o están vacíos), muestra un mensaje
    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No se encontraron datos. Intente recargar.</td></tr>';
        return;
    }

    // Iterar sobre el array global 'datos' para renderizar las filas
    datos.forEach(item => {
        const id = item.id;
        // Asegurarse de que 'item' tiene los campos 'nombre' y 'direccion'
        const nombre = item.nombre || '';
        const direccion = item.direccion || '';

        const textoCompleto = `${nombre} ${direccion}`.toLowerCase();

        if (!filtro || textoCompleto.includes(filtro)) {
            const fila = document.createElement("tr");
            fila.dataset.id = id;
            // Después (Sin contenteditable)
            fila.innerHTML = `
    <td onblur="guardarEdicionDato(${id}, 'nombre', this.textContent)">
        ${nombre}
    </td>
    <td onblur="guardarEdicionDato(${id}, 'direccion', this.textContent)">
        ${direccion}
    </td>
    <td><button onclick="alternarSeleccionGeneral(${id})">Seleccionar</button></td>
`;
            tbody.appendChild(fila);
        }
    });

    renderTablaBotones();
}

/**
 * Renderiza los botones Seleccionar/Quitar
 */
function renderTablaBotones() {
    const filas = tbody.querySelectorAll("tr");

    filas.forEach(fila => {
        const id = parseInt(fila.dataset.id);
        const boton = fila.querySelector("button");

        const estaSeleccionado = seleccionGeneral.includes(id);

        if (estaSeleccionado) {
            boton.textContent = 'Quitar';
            boton.style.backgroundColor = 'var(--color-acento-peligro)';
        } else {
            boton.textContent = 'Seleccionar';
            boton.style.backgroundColor = 'var(--color-acento-principal)';
        }
    });
}

function renderSeleccionados() {
    seleccionadosDiv.innerHTML = "";
    const elementosSeleccionados = {};

    grupos.forEach(nombre => {
        elementosSeleccionados[nombre] = [];
    });

    seleccionGeneral.forEach(idEnDatos => {
        const idStr = String(idEnDatos);
        const item = encontrarItemPorId(idEnDatos);

        if (!item) return;

        const gruposAsignados = elementoGrupos[idStr] || [grupoActivo];

        gruposAsignados.forEach(grupo => {
            if (elementosSeleccionados[grupo]) {
                elementosSeleccionados[grupo].push({
                    id: idEnDatos,
                    item: item
                });
            }
        });
    });

    let hayContenido = false;
    grupos.forEach(grupo => {
        if (elementosSeleccionados[grupo].length > 0) {
            hayContenido = true;

            const titulo = document.createElement("div");
            titulo.className = "grupo-titulo";
            titulo.innerText = grupo;
            seleccionadosDiv.appendChild(titulo);

            elementosSeleccionados[grupo].forEach(data => {
                const div = document.createElement("div");
                div.className = "item-seleccionado";
                div.dataset.id = data.id;

                div.innerHTML = `
                    <div style="display:flex; flex-direction: column; flex-grow: 1;">
                        <span>${data.item.nombre} - ${data.item.direccion}</span>
                    </div>
                    
                    <button onclick="alternarSeleccionGeneral(${data.id})" style="
                        background-color: var(--color-acento-peligro); 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        padding: 5px 10px;
                        font-weight: bold;
                        margin-left: 10px;
                    ">
                        ❌
                    </button>
                `;
                seleccionadosDiv.appendChild(div);
            });
        }
    });

    if (!hayContenido) {
        seleccionadosDiv.innerHTML = "<p class='mensaje-estado'>Aún no hay elementos seleccionados.</p>";
    }
}

function renderGrupos() {
    const grupoBotones = document.getElementById("grupo-botones");
    if (!grupoBotones) return;

    grupoBotones.innerHTML = grupos.map(nombre => {
        const esActivo = nombre === grupoActivo;
        const esEditando = nombre === grupoEditando;

        if (esEditando) {
            return `
                <div class="grupo-control grupo-editando">
                    <input type="text" id="input-renombrar" value="${nombre}">
                    <button onclick="renombrarGrupo('${nombre}', document.getElementById('input-renombrar').value)" title="Guardar">✔</button>
                    <button onclick="grupoEditando=null; renderGrupos()" title="Cancelar">✖</button>
                </div>
            `;
        } else {
            return `
                <div class="grupo-control ${esActivo ? 'activo' : ''}" 
                    draggable="true" 
                    ondragstart="event.dataTransfer.setData('text/plain', '${nombre}')"
                    ondragover="event.preventDefault()"
                    ondrop="reordenarGrupos(event.dataTransfer.getData('text/plain'), '${nombre}')">
                    
                    <button class="grupo-btn ${esActivo ? 'activo' : ''}" 
                        onclick="setGrupo('${nombre}')">
                        <span>${nombre}</span>
                    </button>
                    
                    <div class="acciones-grupo">
                        <button class="mod-btn" onclick="event.stopPropagation(); grupoEditando='${nombre}'; renderGrupos()" title="Renombrar">✏️</button>
                        <button class="mod-btn" onclick="event.stopPropagation(); eliminarGrupo('${nombre}')" title="Eliminar">🗑️</button>
                    </div>
                </div>
            `;
        }
    }).join('');
}


window.copiarAlPortapapeles = function () {
    if (seleccionGeneral.length === 0) {
        mostrarNotificacion("No hay elementos seleccionados para copiar.", 'info');
        return;
    }

    let textoFinal = "";
    let contenidoPorGrupo = {};

    seleccionGeneral.forEach(id => {
        const idStr = String(id);
        const item = encontrarItemPorId(id);

        if (!item) return;

        const gruposAsignados = elementoGrupos[idStr] || [grupoActivo];
        const linea = `${item.nombre} - ${item.direccion}`;

        gruposAsignados.forEach(grupo => {
            if (!contenidoPorGrupo[grupo]) {
                contenidoPorGrupo[grupo] = [];
            }
            if (!contenidoPorGrupo[grupo].includes(linea)) {
                contenidoPorGrupo[grupo].push(linea);
            }
        });
    });

    let keys = Object.keys(contenidoPorGrupo).sort((a, b) => grupos.indexOf(a) - grupos.indexOf(b));

    keys.forEach(grupo => {
        textoFinal += `\n--- ${grupo} ---\n`;
        textoFinal += contenidoPorGrupo[grupo].join('\n');
        textoFinal += '\n';
    });

    navigator.clipboard.writeText(textoFinal.trim())
        .then(() => mostrarNotificacion(`Elementos agrupados copiados al portapapeles.`, 'exito'))
        .catch(err => mostrarNotificacion("Error al copiar al portapapeles.", 'error'));
}


// ====================================================================
// PARTE 6: INICIALIZACIÓN
// ====================================================================

window.cerrarModalGrupo = function () { modalGrupo.style.display = "none"; }
window.confirmarCrearGrupo = function () {
    const nombre = inputModalGrupo.value.trim();
    if (nombre && !grupos.includes(nombre)) {
        grupos.push(nombre);
        setGrupo(nombre);
        mostrarNotificacion(`Grupo "${nombre}" creado con éxito.`, 'exito');
    } else {
        mostrarNotificacion("El nombre es inválido o el grupo ya existe.", 'error');
    }
    cerrarModalGrupo();
}

busquedaInput.addEventListener("input", renderTablaInicial);

/**
 * Carga los datos desde la API de Render y pone en marcha la aplicación.
 */
async function inicializarAplicacion() {
    // 1. Cargar el estado guardado de la selección y grupos
    cargarEstado();

    // 2. CARGA DE DATOS ASÍNCRONA DESDE LA API (Render)
    try {
        const response = await fetch(RENDER_API_URL);
        if (response.ok) {
            datos = await response.json();
        } else {
            // Si el servidor responde con error, datos queda vacío.
            datos = [];
            throw new Error('API respondió con error: ' + response.statusText);
        }
    } catch (e) {
        // Esto captura fallos de conexión (servidor caído o cold start muy largo)
        console.error("No se pudo conectar al servidor o cargar la fuente de datos.", e);
        mostrarNotificacion("Error: No se pudo cargar la fuente de datos. Revisa la URL de Render.", 'error');
    }

    // 3. Renderizado INICIAL: ¡Se llama AQUÍ, después de que 'datos' está lleno!
    renderTablaInicial();
    setGrupo(grupoActivo);
}

// Inicialización de la aplicación al cargar el documento
document.addEventListener('DOMContentLoaded', inicializarAplicacion);