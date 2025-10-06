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
const tbody = document.querySelector("#tabla-tbody");
const seleccionadosDiv = document.getElementById("seleccionados");
const busquedaInput = document.getElementById("busqueda");
const modalGrupo = document.getElementById("modal-grupo");
const inputModalGrupo = document.getElementById("input-modal-grupo");

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
// FUNCIÓN AUXILIAR: DEBOUNCE (Para optimizar la búsqueda)
// ====================================================================
function debounce(func, delay) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
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
// PARTE 3: GESTIÓN DE SELECCIÓN (TABLA) - SIN MODO EDICIÓN
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
        } else if (!elementoGrupos[idStr].includes(grupoActivo)) {
            elementoGrupos[idStr].push(grupoActivo);
        }

    } else {
        // Quitar elemento
        // Si el elemento pertenece a más de un grupo, solo quitamos la etiqueta del grupo activo.
        if (elementoGrupos[idStr] && elementoGrupos[idStr].length > 1) {
            elementoGrupos[idStr] = elementoGrupos[idStr].filter(g => g !== grupoActivo);
        } else {
            // Si solo pertenece al grupo activo, lo eliminamos de la selección general
            seleccionGeneral.splice(itemIdIndex, 1);
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
    const inputElement = document.getElementById("input-modal-grupo");
    if (!inputElement) return;

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
                // Quitar la referencia al grupo eliminado
                elementoGrupos[id] = elementoGrupos[id].filter(tag => tag !== nombre);

                // Si el elemento queda sin grupos asignados, lo quitamos de seleccionGeneral
                if (elementoGrupos[id].length === 0) {
                    const idNum = parseInt(id);
                    const index = seleccionGeneral.indexOf(idNum);
                    if (index > -1) {
                        seleccionGeneral.splice(index, 1);
                    }
                    delete elementoGrupos[id];
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
// PARTE 5: RENDERIZADO DE UI
// ====================================================================

/**
 * Centraliza la actualización de la UI y guarda el estado.
 */
function actualizarVistas() {
    renderGrupos();
    renderSeleccionados();
    renderTablaInicial(); // Llama a renderTablaInicial para actualizar el botón
    guardarEstado();
}


function renderTablaInicial() {
    tbody.innerHTML = "";
    const filtro = busquedaInput.value.toLowerCase();

    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No se encontraron datos. Intente recargar.</td></tr>';
        return;
    }

    datos.forEach(item => {
        const id = item.id;

        const nombre = item.nombre || '';
        const direccion = item.direccion || '';

        // Determinar si el elemento está en el grupo activo
        const estaEnGrupoActivo = elementoGrupos[String(id)] && elementoGrupos[String(id)].includes(grupoActivo);

        // Ajustar el filtro
        const textoCompleto = `${nombre} ${direccion}`.toLowerCase();

        if (!filtro || textoCompleto.includes(filtro)) {
            const fila = document.createElement("tr");
            fila.dataset.id = id;
            // Destacar si está seleccionado en el grupo activo
            fila.style.backgroundColor = estaEnGrupoActivo ? 'rgba(106, 130, 251, 0.1)' : '';

            fila.innerHTML = `
                <td>${nombre}</td>
                <td>${direccion}</td>
                <td>
                    <button onclick="alternarSeleccionGeneral(${id})" 
                            style="background-color: ${estaEnGrupoActivo ? 'var(--color-acento-peligro)' : 'var(--color-acento-principal)'};">
                        ${estaEnGrupoActivo ? 'Quitar' : 'Seleccionar'}
                    </button>
                </td>
            `;

            tbody.appendChild(fila);
        }
    });
}


function renderSeleccionados() {
    seleccionadosDiv.innerHTML = "";

    const elementosSeleccionadosEnGrupo = seleccionGeneral.filter(id => {
        return elementoGrupos[String(id)] && elementoGrupos[String(id)].includes(grupoActivo);
    }).map(id => encontrarItemPorId(id));

    if (elementosSeleccionadosEnGrupo.length === 0) {
        seleccionadosDiv.innerHTML = `<p class='mensaje-estado'>Aún no hay elementos seleccionados en el grupo "${grupoActivo}".</p>`;
        return;
    }

    // Agrupar los seleccionados por otros grupos a los que pertenecen
    let agrupadoPorOtrosGrupos = {};

    elementosSeleccionadosEnGrupo.forEach(item => {
        const idStr = String(item.id);
        // Obtener los grupos asignados que NO son el grupo activo
        const otrosGrupos = (elementoGrupos[idStr] || []).filter(g => g !== grupoActivo);
        const clave = otrosGrupos.length > 0 ? otrosGrupos.sort().join(', ') : 'Otros';

        if (!agrupadoPorOtrosGrupos[clave]) {
            agrupadoPorOtrosGrupos[clave] = [];
        }
        agrupadoPorOtrosGrupos[clave].push(item);
    });

    Object.keys(agrupadoPorOtrosGrupos).sort().forEach(claveGrupo => {
        const titulo = document.createElement("div");
        titulo.className = "grupo-titulo";
        titulo.innerText = claveGrupo === 'Otros' ? 'No Asignado a otros grupos' : `Grupos Adicionales: ${claveGrupo}`;
        seleccionadosDiv.appendChild(titulo);

        agrupadoPorOtrosGrupos[claveGrupo].forEach(item => {
            const div = document.createElement("div");
            div.className = "item-seleccionado";
            div.dataset.id = item.id;

            div.innerHTML = `
                <div style="display:flex; flex-direction: column; flex-grow: 1;">
                    <span>${item.nombre} - ${item.direccion}</span>
                </div>
                
                <button onclick="alternarSeleccionGeneral(${item.id})" style="
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
    });
}

function renderGrupos() {
    const grupoBotones = document.getElementById("grupo-botones");
    if (!grupoBotones) return;

    grupoBotones.innerHTML = grupos.map(nombre => {
        const esActivo = nombre === grupoActivo;
        const esEditando = nombre === grupoEditando;

        // Contar cuántos elementos de seleccionGeneral están en este grupo
        const contador = seleccionGeneral.filter(id => {
            return elementoGrupos[String(id)] && elementoGrupos[String(id)].includes(nombre);
        }).length;


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
                        <span class="contador">${contador}</span>
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
    // Solo copiamos los elementos seleccionados en el grupo activo
    const elementosACopiar = seleccionGeneral.filter(id => {
        return elementoGrupos[String(id)] && elementoGrupos[String(id)].includes(grupoActivo);
    });

    if (elementosACopiar.length === 0) {
        mostrarNotificacion("No hay elementos seleccionados para copiar en el grupo activo.", 'info');
        return;
    }

    let textoFinal = "";

    elementosACopiar.forEach(id => {
        const item = encontrarItemPorId(id);
        if (item) {
            // Formato: Nombre - Dirección, Comuna
            textoFinal += `${item.nombre} - ${item.direccion}\n`;
        }
    });

    navigator.clipboard.writeText(textoFinal.trim())
        .then(() => mostrarNotificacion(`¡${elementosACopiar.length} elementos copiados de "${grupoActivo}"!`, 'exito'))
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

// Vinculación de búsqueda con debounce
busquedaInput.addEventListener("input", debounce(renderTablaInicial, 300));


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
            datos = [];
            throw new Error('API respondió con error: ' + response.statusText);
        }
    } catch (e) {
        console.error("No se pudo conectar al servidor o cargar la fuente de datos.", e);
        mostrarNotificacion("Error: No se pudo cargar la fuente de datos. Revisa la URL de Render.", 'error');
    }

    // 3. Renderizado INICIAL
    renderTablaInicial();
    setGrupo(grupoActivo);

    // 4. Inicializa el modal de confirmación
    inicializarConfirmacionModal();
}

// Inicialización de la aplicación al cargar el documento
document.addEventListener('DOMContentLoaded', inicializarAplicacion);