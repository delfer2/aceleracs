const STORAGE_KEY = 'acelera_cs_onboardings';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarTabela();
});

function getTreinamentos() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveTreinamentos(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Alternar entre Telas
function abrirFormulario(editData = null) {
    document.getElementById('viewDashboard').classList.add('hidden');
    document.getElementById('viewFormulario').classList.remove('hidden');
    
    if (editData) {
        document.getElementById('formTitle').innerText = "Editar Treinamento";
        preencherFormulario(editData);
    } else {
        document.getElementById('formTitle').innerText = "Novo Treinamento de Onboarding";
        document.getElementById('onboardingForm').reset();
        document.getElementById('treinamentoId').value = "";
    }
}

function cancelarFormulario() {
    document.getElementById('viewFormulario').classList.add('hidden');
    document.getElementById('viewDashboard').classList.remove('hidden');
    document.getElementById('onboardingForm').reset();
}

// Formatar data para exibição (DD/MM/AAAA)
function formatarData(dataISO) {
    if (!dataISO) return '';
    const parts = dataISO.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Renderizar Tabela
function carregarTabela(dadosFiltrados = null) {
    const lista = dadosFiltrados || getTreinamentos();
    const tbody = document.getElementById('tabelaTreinamentos');
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">Nenhum treinamento cadastrado.</td></tr>`;
        return;
    }

    lista.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.empresa}</strong></td>
            <td>${item.segmento}</td>
            <td>${item.porte}</td>
            <td>${item.funcionalidadePrioritaria}</td>
            <td>${formatarData(item.dataTreinamento)}</td>
            <td>
                <button class="btn-action-icon" title="Editar" onclick="editarTreinamento(${item.id})">✏️</button>
                <button class="btn-action-icon" title="Excluir" onclick="excluirTreinamento(${item.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Salvar / Atualizar
function salvarTreinamento(e) {
    e.preventDefault();

    const idField = document.getElementById('treinamentoId').value;
    const treinamentos = getTreinamentos();

    const novoRegistro = {
        id: idField ? Number(idField) : Date.now(),
        empresa: document.getElementById('empresa').value,
        dataTreinamento: document.getElementById('dataTreinamento').value,
        segmento: document.getElementById('segmento').value,
        porte: document.getElementById('porte').value,
        participantes: document.getElementById('participantes').value,
        qtdUsuarios: document.getElementById('qtdUsuarios').value,
        
        jaUtilizouSimilar: document.getElementById('jaUtilizouSimilar').value,
        vaiOperarDiretamente: document.getElementById('vaiOperarDiretamente').value,
        perfilParticipante: document.getElementById('perfilParticipante').value,

        funcionalidadePrioritaria: document.getElementById('funcionalidadePrioritaria').value,
        resultadoEsperado: document.getElementById('resultadoEsperado').value,
        previsaoConsultas: document.getElementById('previsaoConsultas').value,
        periodicidade: document.getElementById('periodicidade').value,

        duvidas: document.getElementById('duvidas').value,
        pontosAtencao: document.getElementById('pontosAtencao').value,
        obsGerais: document.getElementById('obsGerais').value
    };

    if (idField) {
        const index = treinamentos.findIndex(t => t.id === Number(idField));
        if (index !== -1) treinamentos[index] = novoRegistro;
    } else {
        treinamentos.push(novoRegistro);
    }

    saveTreinamentos(treinamentos);
    cancelarFormulario();
    carregarTabela();
}

// Preencher formulário para Edição
function preencherFormulario(item) {
    document.getElementById('treinamentoId').value = item.id;
    document.getElementById('empresa').value = item.empresa;
    document.getElementById('dataTreinamento').value = item.dataTreinamento;
    document.getElementById('segmento').value = item.segmento;
    document.getElementById('porte').value = item.porte;
    document.getElementById('participantes').value = item.participantes;
    document.getElementById('qtdUsuarios').value = item.qtdUsuarios;

    document.getElementById('jaUtilizouSimilar').value = item.jaUtilizouSimilar;
    document.getElementById('vaiOperarDiretamente').value = item.vaiOperarDiretamente;
    document.getElementById('perfilParticipante').value = item.perfilParticipante;

    document.getElementById('funcionalidadePrioritaria').value = item.funcionalidadePrioritaria;
    document.getElementById('resultadoEsperado').value = item.resultadoEsperado;
    document.getElementById('previsaoConsultas').value = item.previsaoConsultas;
    document.getElementById('periodicidade').value = item.periodicidade;

    document.getElementById('duvidas').value = item.duvidas;
    document.getElementById('pontosAtencao').value = item.pontosAtencao;
    document.getElementById('obsGerais').value = item.obsGerais;
}

function editarTreinamento(id) {
    const item = getTreinamentos().find(t => t.id === id);
    if (item) abrirFormulario(item);
}

function excluirTreinamento(id) {
    if (confirm("Tem certeza que deseja excluir este registro de treinamento?")) {
        let treinamentos = getTreinamentos();
        treinamentos = treinamentos.filter(t => t.id !== id);
        saveTreinamentos(treinamentos);
        carregarTabela();
    }
}

// Filtros
function aplicarFiltros() {
    const buscaEmpresa = document.getElementById('searchEmpresa').value.toLowerCase();
    const filtroSegmento = document.getElementById('filterSegmento').value;
    const filtroPorte = document.getElementById('filterPorte').value;
    const filtroData = document.getElementById('filterData').value;

    const treinamentos = getTreinamentos();

    const filtrados = treinamentos.filter(item => {
        const matchEmpresa = item.empresa.toLowerCase().includes(buscaEmpresa);
        const matchSegmento = filtroSegmento === "" || item.segmento === filtroSegmento;
        const matchPorte = filtroPorte === "" || item.porte === filtroPorte;
        const matchData = filtroData === "" || item.dataTreinamento === filtroData;

        return matchEmpresa && matchSegmento && matchPorte && matchData;
    });

    carregarTabela(filtrados);
}