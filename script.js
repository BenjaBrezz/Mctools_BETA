// ====================================================================
// PARTE 1: DATOS Y VARIABLES GLOBALES
// ====================================================================

// Datos base
const datos = [
    { id: 0, nombre: "Juan Pérez", direccion: "Av. Siempre Viva 123" },
    { id: 1, nombre: "Ana Gómez", direccion: "Calle Falsa 456" },
    { id: 2, nombre: "Carlos Rivera", direccion: "Boulevard del Sol 88" },
    { id: 3, nombre: "María Soto", direccion: "Paseo de la Luna 40" },
    { id: 4, nombre: "Felipe Vidal", direccion: "Calle del Río 55" },
];

// Elementos del DOM
const tbody = document.querySelector("#tabla tbody");
const seleccionadosDiv = document.getElementById("seleccionados");
const grupoBotones = document.getElementById("grupo-botones");
const nuevoGrupoInput = document.getElementById("nuevo-grupo");
const busquedaInput = document.getElementById("busqueda");
const crearGrupoFlotante = document.getElementById("crear-grupo-flotante");
const modalGrupo = document.getElementById("modal-grupo");
const inputModalGrupo = document.getElementById("input-modal-grupo");
const modalConfirmacion = document.getElementById("modal-confirmacion");
const confirmacionTitulo = document.getElementById("confirmacion-titulo");
const confirmacionMensaje = document.getElementById("confirmacion-mensaje");
const btnConfirmar = document.getElementById("btn-confirmar");
const btnCancelar = document.getElementById("btn-cancelar");

// REFERENCIAS PARA EL TOAST DE NOTIFICACIÓN
const notificacionToast = document.getElementById("notificacion-toast");
const toastMensaje = document.getElementById("toast-mensaje");
const toastIcono = document.getElementById("toast-icono");

// Estado de la Aplicación (Valores predeterminados que se cargarán si no hay datos guardados)
let grupoActivo = "Grupo 1";
let grupos = ["Grupo 1", "Grupo 2", "Grupo 3"]; // Lista de grupos/títulos disponibles
let grupoEditando = null;

// La selección general
let seleccionGeneral = [];

// La AGRUPACIÓN INTERIOR: Define a qué grupos pertenece cada índice *ya seleccionado*.
let elementoGrupos = {};


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

            // Asignar los valores cargados, usando los valores por defecto si no existen
            grupos = estado.grupos || ["Grupo 1", "Grupo 2", "Grupo 3"];
            seleccionGeneral = estado.seleccionGeneral || [];
            elementoGrupos = estado.elementoGrupos || {};

            // Asegurar que el grupo activo exista en la lista cargada
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
// PARTE 2: GESTIÓN DE NOTIFICACIONES
// ====================================================================

/**
 * Muestra una notificación personalizada interna (Toast).
 * @param {string} mensaje El mensaje a mostrar.
 * @param {string} tipo 'exito', 'error', o 'info'.
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

    // Quita la clase de oculto y añade la de visible
    notificacionToast.classList.remove('toast-oculto');
    notificacionToast.classList.add('toast-visible');

    // Ocultar el toast después de 3.5 segundos
    setTimeout(() => {
        notificacionToast.classList.remove('toast-visible');
    }, 3500);
}

// ====================================================================
// PARTE 2B: MODAL DE CONFIRMACIÓN PERSONALIZADO
// ====================================================================

let accionConfirmarCallback = () => { };

/**
 * Muestra el modal de confirmación personalizado.
 * @param {string} titulo El título de la acción.
 * @param {string} mensaje El mensaje de la pregunta (ej. "¿Seguro que desea eliminar X?").
 * @param {function} callback Función a ejecutar si el usuario confirma.
 */
function mostrarConfirmacion(titulo, mensaje, callback) {
    confirmacionTitulo.textContent = titulo;
    confirmacionMensaje.textContent = mensaje;
    accionConfirmarCallback = callback; // Guardar la función que se ejecutará

    // Mostrar el modal
    modalConfirmacion.style.display = 'flex';
}

// Configurar los eventos de clic una sola vez (al inicio de la aplicación)
function inicializarConfirmacionModal() {
    btnConfirmar.onclick = () => {
        modalConfirmacion.style.display = 'none';
        accionConfirmarCallback(); // Ejecutar la acción guardada
    };

    btnCancelar.onclick = () => {
        modalConfirmacion.style.display = 'none';
        // No hacer nada, solo cerrar
    };
}

// ====================================================================
// PARTE 3: GESTIÓN DE SELECCIÓN (TABLA)
// ====================================================================

/**
 * Mueve un elemento de la tabla al recuadro de seleccionados, o lo quita.
 */
function alternarSeleccionGeneral(index) {
    const itemIndex = seleccionGeneral.indexOf(index);
    const indexStr = String(index);

    if (itemIndex === -1) {
        // Añadir: Mover a seleccionGeneral y asignarle el grupo activo como título inicial
        seleccionGeneral.push(index);

        if (!elementoGrupos[indexStr]) {
            elementoGrupos[indexStr] = [grupoActivo];
        }

    } else {
        // Quitar: Remover de seleccionGeneral y limpiar sus grupos
        seleccionGeneral.splice(itemIndex, 1);
        if (elementoGrupos[indexStr]) {
            delete elementoGrupos[indexStr];
        }
    }

    actualizarVistas();
}


// ====================================================================
// PARTE 4: GESTIÓN DE AGRUPACIÓN (BARRA LATERAL)
// ====================================================================

/**
 * Cambia el grupo activo (Solo cambia el título de trabajo).
 */
function setGrupo(nombre) {
    grupoActivo = nombre;
    grupoEditando = null;
    busquedaInput.value = "";
    actualizarVistas();
}

/**
 * Función de crear grupo.
 */
window.crearGrupo = function () {
    if (nuevoGrupoInput) {
        const nombre = nuevoGrupoInput.value.trim();
        if (nombre && !grupos.includes(nombre)) {
            grupos.push(nombre);
            nuevoGrupoInput.value = "";
            setGrupo(nombre);
        }
    }
}

/**
 * Renombra grupo (Actualiza la lista de grupos y los títulos asignados)
 */
window.renombrarGrupo = function (viejo, nuevo) {
    if (!nuevo || grupos.includes(nuevo)) {
        mostrarNotificacion("El nombre es inválido o ya existe.", 'error');
        return;
    }
    grupos = grupos.map(g => g === viejo ? nuevo : g);

    // Actualizar títulos en elementoGrupos
    for (const index in elementoGrupos) {
        elementoGrupos[index] = elementoGrupos[index].map(tag => tag === viejo ? nuevo : tag);
    }

    if (grupoActivo === viejo) grupoActivo = nuevo;
    grupoEditando = null;
    actualizarVistas();
    mostrarNotificacion(`Grupo "${viejo}" renombrado a "${nuevo}".`, 'exito');
}

/**
 * Elimina grupo (Utiliza el modal de confirmación personalizado).
 */
window.eliminarGrupo = function (nombre) {
    if (grupos.length <= 1) {
        mostrarNotificacion("No puedes eliminar el único grupo restante.", 'error');
        return;
    }

    // --- USAR MODAL DE CONFIRMACIÓN PERSONALIZADO ---
    mostrarConfirmacion(
        "Eliminar Grupo",
        `¿Estás seguro de que deseas eliminar permanentemente el grupo "${nombre}"? Esta acción no se puede deshacer.`,

        // Función de Callback (se ejecuta si el usuario confirma)
        () => {
            // Lógica de Eliminación
            grupos = grupos.filter(g => g !== nombre);

            for (const index in elementoGrupos) {
                elementoGrupos[index] = elementoGrupos[index].filter(tag => tag !== nombre);
                if (elementoGrupos[index].length === 0) {
                    elementoGrupos[index].push(grupoActivo);
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

/**
 * Reordena grupos por drag & drop
 */
window.reordenarGrupos = function (origen, destino) {
    const i = grupos.indexOf(origen);
    const j = grupos.indexOf(destino);
    if (i !== -1 && j !== -1 && i !== j) {
        const nuevoOrden = [...grupos];
        nuevoOrden.splice(i, 1);
        nuevoOrden.splice(j, 0, origen);
        grupos = nuevoOrden;
        renderGrupos();
        guardarEstado(); // Guardar después de reordenar
    }
}


// ====================================================================
// PARTE 5: RENDERIZADO DE UI (TABLA Y SELECCIONADOS)
// ====================================================================

/**
 * Centraliza la actualización de la UI y guarda el estado.
 */
function actualizarVistas() {
    renderGrupos();
    renderSeleccionados();
    renderTablaBotones();

    // GUARDAR EL ESTADO después de cualquier cambio en la vista/datos
    guardarEstado();
}

/**
 * Renderiza los botones de la tabla y su estado (Seleccionar/Quitar)
 */
function renderTablaBotones() {
    const filas = tbody.querySelectorAll("tr");

    filas.forEach(fila => {
        const index = parseInt(fila.dataset.index);
        const boton = fila.querySelector("button");

        const estaSeleccionado = seleccionGeneral.includes(index);

        if (estaSeleccionado) {
            boton.textContent = 'Quitar';
            boton.style.backgroundColor = 'var(--color-acento-peligro)';
        } else {
            boton.textContent = 'Seleccionar';
            boton.style.backgroundColor = 'var(--color-acento-principal)';
        }

        boton.onclick = () => alternarSeleccionGeneral(index);
    });
}

/**
 * Inicializa la tabla con los data-attributes, APLICANDO FILTRO DE BÚSQUEDA.
 */
function renderTablaInicial() {
    tbody.innerHTML = "";
    const filtro = busquedaInput.value.toLowerCase();

    datos.forEach((item, index) => {
        const textoCompleto = `${item.nombre} ${item.direccion}`.toLowerCase();

        // Renderizar si pasa el filtro
        if (!filtro || textoCompleto.includes(filtro)) {
            const fila = document.createElement("tr");
            fila.dataset.index = index;
            fila.innerHTML = `
                <td>${item.nombre}</td>
                <td>${item.direccion}</td>
                <td><button>Seleccionar</button></td>
            `;
            tbody.appendChild(fila);
        }
    });

    renderTablaBotones();
}


/**
 * Renderiza la lista completa de seleccionados, agrupados por sus títulos.
 */
function renderSeleccionados() {
    seleccionadosDiv.innerHTML = "";
    const elementosSeleccionados = {};

    // 1. Inicializar la estructura de agrupación
    grupos.forEach(nombre => {
        elementosSeleccionados[nombre] = [];
    });

    // 2. Llenar la estructura con los elementos de la SELECCIÓN GENERAL
    seleccionGeneral.forEach(indexEnDatos => {
        const indexStr = String(indexEnDatos);
        const item = datos[indexEnDatos];
        const gruposAsignados = elementoGrupos[indexStr] || [grupoActivo];

        gruposAsignados.forEach(grupo => {
            if (elementosSeleccionados[grupo]) {
                elementosSeleccionados[grupo].push({
                    index: indexEnDatos,
                    item: item
                });
            }
        });
    });

    // 3. Renderizar la lista agrupada
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
                div.dataset.index = data.index;

                div.innerHTML = `
                    <div style="display:flex; flex-direction: column; flex-grow: 1;">
                        <span>${data.item.nombre} - ${data.item.direccion}</span>
                    </div>
                    
                    <button onclick="alternarSeleccionGeneral(${data.index})" style="
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

    // Mensajes de estado
    if (!hayContenido && seleccionGeneral.length > 0) {
        const p = document.createElement('p');
        p.textContent = 'Los elementos seleccionados no tienen grupos visibles, o no cumplen el filtro.';
        p.style.color = 'var(--color-texto-secundario)';
        seleccionadosDiv.appendChild(p);
    } else if (seleccionGeneral.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'Aún no has seleccionado ningún elemento de la tabla.';
        p.style.color = 'var(--color-texto-secundario)';
        seleccionadosDiv.appendChild(p);
    }
}


/**
 * Renderiza los botones de grupo en la barra lateral con el contador.
 */
function renderGrupos() {
    grupoBotones.innerHTML = "";

    const conteoEtiquetas = {};
    for (const index in elementoGrupos) {
        elementoGrupos[index].forEach(tag => {
            conteoEtiquetas[tag] = (conteoEtiquetas[tag] || 0) + 1;
        });
    }

    grupos.forEach(nombre => {
        const contenedor = document.createElement("div");
        contenedor.className = "grupo-control";
        contenedor.setAttribute("draggable", "true");
        contenedor.dataset.nombre = nombre;

        // --- Lógica de Drag & Drop y Botones de Edición/Eliminación ---
        contenedor.addEventListener("dragstart", e => {
            contenedor.classList.add("dragging");
            e.dataTransfer.setData("text/plain", nombre);
        });
        contenedor.addEventListener("dragend", () => contenedor.classList.remove("dragging"));
        contenedor.addEventListener("dragover", e => { e.preventDefault(); contenedor.classList.add("over"); });
        contenedor.addEventListener("dragleave", () => contenedor.classList.remove("over"));
        contenedor.addEventListener("drop", e => {
            e.preventDefault();
            contenedor.classList.remove("over");
            const nombreOrigen = e.dataTransfer.getData("text/plain");
            const nombreDestino = contenedor.dataset.nombre;
            reordenarGrupos(nombreOrigen, nombreDestino);
        });

        // Contenido del control de grupo
        if (grupoEditando === nombre) {
            const input = document.createElement("input");
            input.value = nombre;
            input.onkeydown = e => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    renombrarGrupo(nombre, input.value.trim());
                }
            };
            contenedor.appendChild(input);
        } else {
            const btn = document.createElement("button");
            btn.textContent = nombre;
            btn.className = "grupo-btn";
            btn.onclick = () => setGrupo(nombre);
            if (nombre === grupoActivo) btn.classList.add("activo");

            const contador = conteoEtiquetas[nombre] || 0;
            const contadorSpan = document.createElement("span");
            contadorSpan.className = "contador";
            contadorSpan.textContent = ` (${contador})`;

            btn.appendChild(contadorSpan);
            contenedor.appendChild(btn);
        }

        // Botones de editar y eliminar
        const editar = document.createElement("button");
        editar.className = "mod-btn";
        editar.innerHTML = "✏️";
        editar.title = "Renombrar";
        editar.onclick = () => {
            grupoEditando = nombre;
            renderGrupos();
        };
        contenedor.appendChild(editar);

        const eliminar = document.createElement("button");
        eliminar.className = "mod-btn";
        eliminar.innerHTML = "🗑️";
        eliminar.title = "Eliminar";
        eliminar.onclick = () => {
            eliminarGrupo(nombre);
        };
        contenedor.appendChild(eliminar);

        grupoBotones.appendChild(contenedor);
    });
}


/**
 * Copia al portapapeles (Formato agrupado por títulos de grupo, limpio).
 */
window.copiarAlPortapapeles = function () {
    if (seleccionGeneral.length === 0) {
        mostrarNotificacion("No hay elementos seleccionados para copiar.", 'info');
        return;
    }

    let textoFinal = "";
    let contenidoPorGrupo = {};

    // Agrupar el contenido
    seleccionGeneral.forEach(index => {
        const indexStr = String(index);
        const item = datos[index];
        const gruposAsignados = elementoGrupos[indexStr] || [grupoActivo];
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

    // Formatear la salida final
    grupos.forEach(grupo => {
        if (contenidoPorGrupo[grupo] && contenidoPorGrupo[grupo].length > 0) {

            // SOLO EL NOMBRE DEL GRUPO, SEGUIDO DE UN SALTO DE LÍNEA
            textoFinal += `${grupo}\n`;

            // Añadir el listado de elementos
            textoFinal += contenidoPorGrupo[grupo].join("\n") + "\n\n";
        }
    });

    navigator.clipboard.writeText(textoFinal.trim())
        .then(() => mostrarNotificacion(`Elementos agrupados copiados al portapapeles.`, 'exito'))
        .catch(err => mostrarNotificacion("Error al copiar al portapapeles.", 'error'));
}


// ====================================================================
// PARTE 6: INICIALIZACIÓN Y FUNCIONES RESTANTES (MODAL)
// ====================================================================

/**
 * Cierra el modal de creación de grupo.
 */
window.cerrarModalGrupo = function () { modalGrupo.style.display = "none"; }

/**
 * Confirma y crea un grupo desde el modal.
 */
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

// Evento de búsqueda para filtrar la lista de datos DISPONIBLES
busquedaInput.addEventListener("input", renderTablaInicial);

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    // 1. CARGAR EL ESTADO guardado ANTES de cualquier renderizado
    cargarEstado();

    // Enlace del botón flotante (+) al modal
    const crearGrupoFlotante = document.getElementById("crear-grupo-flotante");
    if (crearGrupoFlotante) {
        crearGrupoFlotante.addEventListener("click", () => {
            inputModalGrupo.value = "";
            modalGrupo.style.display = "flex";
            inputModalGrupo.focus();
        });
    }

    // 2. Renderizar la tabla y las vistas con el estado cargado
    renderTablaInicial();
    setGrupo(grupoActivo); // Esto asegura que la UI se actualice con el grupoActivo cargado y llama a actualizarVistas

    // ¡Nuevo! Inicializar el modal de confirmación
    inicializarConfirmacionModal();

    renderTablaInicial();
    setGrupo(grupoActivo);
});