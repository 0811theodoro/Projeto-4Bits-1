let car_type = ["Moto", "Carro", "Caminhonete", "Utilitario"];

function searchCar(event) {
    event.preventDefault();

    const search_board = document.querySelector(".board-car").value;
    if (search_board){
        location.hash=`search=${search_board}`;
        exibeVagas(vagas.filter(v => v.estadia?.cliente?.veiculo?.placa.startsWith(search_board)));
    } else {
        location.hash='';
        exibeVagas(vagas);
    }
}

function handleChangePlan(index) {
    let date_expiration = document.querySelectorAll(".end-date");
    date_expiration[index].setAttr;

    value_select = document.querySelectorAll(".item-plan");
    if (value_select[index].value == "Mensal") {
        date_expiration[index].setAttribute("type", "date");
    } else {
        date_expiration[index].setAttribute("type", "hidden");
    }
}

const handlePhone = (event) => {
    let input = event.target;
    input.value = phoneMask(input.value);
};

const phoneMask = (value) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    return value;
};

const handleCpf = (event) => {
    let input = event.target;
    input.value = cpfMask(input.value);
};

function cpfMask(value) {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");

    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return value;
}

const handleBoard = (event) => {
    let input = event.target;
    input.value = boardMask(input.value.toUpperCase());
};

const boardMask = (value) => {
    if (!value) return "";
    value = value.replace(/(\w{3})(\d{1})(\w{1})(\d{2})/, "$1-$2$3$4");
    value = value.replace(/(\w{3})(\d{1})(\w{1})(\d{2})/, "$1-$2$3$4");
    return value;
};

const alertBoard = (event) => {
    var regex = "[A-Z]{3}-[0-9]{1}[0-9A-Z]{1}[0-9]{2}|[A-Z]{3}-[0-9]4";
    var placa = event.target.value;

    if (!placa.match(regex)) {
        window.alert("A placa deve ser digitada no formato AAA9A99 ou AAA9999 em que A é uma letra e 9 um dígito")

    }
};

let vagas = [];
async function carregaVagas() {
    var response = await fetch('/vagas');
    vagas = await response.json();

    return exibeVagas(vagas);
}

function hasRole(role) {
    let roles = document.getElementById('_user_role').content;
    roles = roles.split(',');
    return roles.indexOf(role) !== -1;
}

function exibeVagas(vagas) {
    const isManager = hasRole('MANAGER');

    //pega o elemento ul para adicionar as vagas
    const items = vagas.map((vaga) => {
        const estadia = vaga.estadia || {};
        const client = estadia.cliente || {};
        const car = client.veiculo || {};

        return { vaga, estadia, client, car }
    });

    Handlebars.registerHelper('select', function(selected, option) {
        return (selected == option) ? 'selected="selected"' : '';
    });

    Handlebars.registerHelper('equals', function(arg1, arg2) {
        return arg1 == arg2;
    });

    Handlebars.registerHelper('and', function(...elements) {
        return elements.every(element => !!element);
    });

    Handlebars.registerHelper('not', function(value) {
        return !value;
    });

    Handlebars.registerHelper('dateFormat', function (value) {
        let date = value.split("T", 3)[0];
        date = date.split("-");
        return `${date[2]}/${date[1]}/${date[0]}`;
    });

    Handlebars.registerHelper('editable', (estadia)  => {
        return isManager || !estadia.id
    });

    Handlebars.registerHelper('pedingPayment', function(estadia) {
        return (!!estadia.expiracao && !estadia.pagamento) || (!!estadia.saida && !estadia.pagamento)
    });

    var source = $("#estadia-template").html();
    var template = Handlebars.compile(source);
    var html = template({items});
    const container = $(".list-item-set");
    container.empty();
    container.append(html);
}

async function submitForm(form) {
    var data = getData(form);

    if (data.id_estadia) {
        return await encerraEstadia(data);
    } else {
        return await iniciaEstadia(data);
    }
}
async function encerraEstadia(data) {
    var token = document.getElementById('_csrf').content;
    var header = document.getElementById('_csrf_header').content;

    var response = await fetch(`/estadias/${data.id_estadia}/encerrar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accepts': 'application/json',
            [header]: token
        },
        credentials: 'include',
        body: JSON.stringify()
    })

    if (response.status === 200) {
        var estadia = await response.json();
        if (estadia.status === "INATIVO") {
            alert(`Estadia encerrada. Total de horas: ${getDuration(Date.parse(estadia.entrada), Date.parse(estadia.saida))}`)
            location.reload();
        } else {
            location.href = `/pagamentos/novo?estadia_id=${estadia.id}`;
        }
    } else {
        let error = await getApiError(response);
        alert('Erro ' + error);
    }
}

async function iniciaEstadia(data) {
    var token = document.getElementById('_csrf').content;
    var header = document.getElementById('_csrf_header').content;

    let veiculo
    try {
        veiculo = await criaVeiculo(data, {[header]: token});
        console.log('Veiculo criado / encontrato' + JSON.stringify(veiculo));
    } catch(e) {
        return alert('Erro ao criar veículo: ' + e);
    }

    let cliente
    try {
        cliente = await criaCliente({...data, veiculoId: veiculo.id}, {[header]: token});
        console.log('Cliente criado / encontrato' + JSON.stringify(cliente));
    } catch(e) {
        return alert('Erro ao criar cliente: ' + e);
    }

    let estadia
    try {
        estadia = await criaEstadia({...data, clienteId: cliente.id}, {[header]: token});
        console.log('Estadia criada: ' + JSON.stringify(estadia));
        alert('Estadia iniciada em: ' + estadia.entrada)
        location.reload();
    } catch(e) {
        return alert('Erro ao criar estadia: ' + e);
    }


}

async function criaVeiculo({ placa, marca, modelo, cor, tipo }, csrfHeader) {
    response = await fetch(`/veiculos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accepts': 'application/json',
            ...csrfHeader
        },
        credentials: 'include',
        body: JSON.stringify({
            placa, marca, modelo, cor, tipo
        }),
    });

    if (response.status === 200) {
        return response.json();
    }

    let error = await getApiError(response);
    throw error;
}

async function criaCliente({ nome, cpf, telefone, veiculoId }, csrfHeader) {
    response = await fetch(`/clientes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accepts': 'application/json',
            ...csrfHeader
        },
        credentials: 'include',
        body: JSON.stringify({
            nome, cpf, telefone, veiculoId
        }),
    });

    if (response.status === 200) {
        return response.json();
    }

    let error = await getApiError(response);
    throw error;
}

async function criaEstadia({ vagaId, clienteId, plano }, csrfHeader) {
    response = await fetch(`/estadias`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accepts': 'application/json',
            ...csrfHeader
        },
        credentials: 'include',
        body: JSON.stringify({
            vagaId, clienteId, plano
        }),
    });

    if (response.status === 200) {
        return response.json();
    }

    let error = await getApiError(response);
    throw error;
}

async function getApiError(response) {
    let error = await response.text();
    try {
        error = JSON.parse(error);
        error = error.errors?.map((e) => e.defaultMessage).join('. ') || error.message;
    } catch(e) {
        error = error
    }

    return error;
}

function getData(form) {
  var formData = new FormData(form);
  var data = Object.fromEntries(formData);

  data.cpf = (data.cpf || '').replace(/[ -.()]/g, '')
  data.placa = (data.placa || '').replace(/[ -.()]/g, '')
  data.telefone = (data.telefone || '').replace(/[ -.()]/g, '')

  return data;
}

function getDuration(startDate, endDate) {
    let duration_hours = String(getHoursDiff(endDate, startDate));
    let duration_minutes = String(getMinutesDiff(endDate, startDate) % 60);
    return `${duration_hours.padStart(2, '0')}:${duration_minutes.padStart(2, '0')}`
}

function getHoursDiff(startDate, endDate) {
    const msInHour = 1000 * 60 * 60;
    return Math.floor(Math.abs(endDate - startDate) / msInHour);
}

function getMinutesDiff(startDate, endDate) {
    const msInMinute = 1000 * 60;
    return Math.ceil(Math.abs(endDate - startDate) / msInMinute);
}