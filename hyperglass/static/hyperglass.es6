// Module Imports
global.jQuery = require('jquery');

const $ = jQuery;
const Popper = require('popper.js');
const bootstrap = require('bootstrap');
const selectpicker = require('bootstrap-select');
const animsition = require('animsition');
const ClipboardJS = require('clipboard');
const frontEndConfig = require('./frontend.json');

const cfgGeneral = frontEndConfig.config.general;
const cfgBranding = frontEndConfig.config.branding;
const cfgNetworks = frontEndConfig.networks;
const inputMessages = frontEndConfig.config.messages;
const pageContainer = $('#hg-page-container');
const formContainer = $('#hg-form');
const titleColumn = $('#hg-title-col');
const rowTwo = $('#hg-row-2');
const vrfContainer = $('#hg-container-vrf');
const queryLocation = $('#location');
const queryType = $('#query_type');
const queryTarget = $('#query_target');
const queryVrf = $('#query_vrf');
const queryTargetAppend = $('#hg-target-append');
const submitIcon = $('#hg-submit-icon');
const resultsContainer = $('#hg-results');
const resultsAccordion = $('#hg-accordion');
const resultsColumn = resultsAccordion.parent();
const backButton = $('#hg-back-btn');
const footerHelpBtn = $('#hg-footer-help-btn');
const footerTermsBtn = $('#hg-footer-terms-btn');
const footerCreditBtn = $('#hg-footer-credit-btn');
const footerPopoverTemplate = '<div class="popover mw-sm-75 mw-md-50 mw-lg-25" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>';

const supportedBtn = qt => `<button class="btn btn-secondary hg-info-btn" id="hg-info-btn-${qt}" data-hg-type="${qt}" type="button"><div id="hg-info-icon-${qt}"><i class="remixicon-information-line"></i></div></button>`;

const vrfSelect = title => `
  <select class="form-control form-control-lg hg-select" id="query_vrf" title="${title}" disabled>
  </select>
`;

const vrfOption = txt => `<option value="${txt}">${txt}</option>`;

class InputInvalid extends Error {
  constructor(validationMsg, invalidField, fieldContainer) {
    super(validationMsg, invalidField, fieldContainer);
    this.name = this.constructor.name;
    this.message = validationMsg;
    this.field = invalidField;
    this.container = fieldContainer;
  }
}

const swapSpacing = (goTo) => {
  if (goTo === 'form') {
    pageContainer.removeClass('px-0 px-md-3');
    resultsColumn.removeClass('px-0');
    titleColumn.removeClass('text-center');
  } else if (goTo === 'results') {
    pageContainer.addClass('px-0 px-md-3');
    resultsColumn.addClass('px-0');
    titleColumn.addClass('text-left');
  }
};

const resetResults = () => {
  queryLocation.selectpicker('deselectAll');
  queryLocation.selectpicker('val', '');
  queryType.selectpicker('val', '');
  queryTarget.val('');
  resultsContainer.animsition('out', formContainer, '#');
  resultsContainer.hide();
  $('.hg-info-btn').remove();
  swapSpacing('form');
  formContainer.show();
  formContainer.animsition('in');
  backButton.addClass('d-none');
  resultsAccordion.empty();
};

const reloadPage = () => {
  queryLocation.selectpicker('deselectAll');
  queryLocation.selectpicker('val', []);
  queryType.selectpicker('val', '');
  queryTarget.val('');
  resultsAccordion.empty();
};

/* Removed liveSearch until bootstrap-select mergest the fix for the mobile keyboard opening issue.
   Basically, any time an option is selected on a mobile device, the keyboard pops open which is
   super annoying. */
queryLocation.selectpicker({
  iconBase: '',
  liveSearch: false,
  selectedTextFormat: 'count > 2',
  style: '',
  styleBase: 'form-control',
  tickIcon: 'remixicon-check-line',
}).on('hidden.bs.select', (e) => {
  $(e.currentTarget).nextAll('.dropdown-menu.show').find('input').blur();
});

queryType.selectpicker({
  iconBase: '',
  liveSearch: false,
  style: '',
  styleBase: 'form-control',
}).on('hidden.bs.select', (e) => {
  $(e.currentTarget).nextAll('.form-control.dropdown-toggle').blur();
});

footerTermsBtn.popover({
  html: true,
  trigger: 'manual',
  template: footerPopoverTemplate,
  placement: 'top',
  content: $('#hg-footer-terms-html').html(),
}).on('click', (e) => {
  $(e.currentTarget).popover('toggle');
}).on('focusout', (e) => {
  $(e.currentTarget).popover('hide');
});

footerHelpBtn.popover({
  html: true,
  trigger: 'manual',
  placement: 'top',
  template: footerPopoverTemplate,
  content: $('#hg-footer-help-html').html(),
}).on('click', (e) => {
  $(e.currentTarget).popover('toggle');
}).on('focusout', (e) => {
  $(e.currentTarget).popover('hide');
});

footerCreditBtn.popover({
  html: true,
  trigger: 'manual',
  placement: 'top',
  title: $('#hg-footer-credit-title').html(),
  content: $('#hg-footer-credit-content').html(),
  template: footerPopoverTemplate,
}).on('click', (e) => {
  $(e.currentTarget).popover('toggle');
}).on('focusout', (e) => {
  $(e.currentTarget).popover('hide');
});

titleColumn.on('click', (e) => {
  window.location = $(e.currentTarget).data('href');
  return false;
});

$(document).ready(() => {
  reloadPage();
  resultsContainer.hide();
  $('#hg-ratelimit-query').modal('hide');
  if (location.pathname == '/') {
    $('.animsition').animsition({
      inClass: 'fade-in',
      outClass: 'fade-out',
      inDuration: 400,
      outDuration: 400,
      transition: (url) => { window.location.href = url; },
    });
    formContainer.animsition('in');
  }
});

queryType.on('changed.bs.select', () => {
  const queryTypeId = queryType.val();
  const queryTypeBtn = $('.hg-info-btn');
  if ((queryTypeId === 'bgp_community') || (queryTypeId === 'bgp_aspath')) {
    queryTypeBtn.remove();
    queryTargetAppend.prepend(supportedBtn(queryTypeId));
  } else {
    queryTypeBtn.remove();
  }
});

function findIntersection(firstSet, ...sets) {
  const count = sets.length;
  const result = new Set(firstSet);
  firstSet.forEach((item) => {
    let i = count;
    let allHave = true;
    while (i--) {
      allHave = sets[i].has(item);
      if (!allHave) { break; }
    }
    if (!allHave) {
      result.delete(item);
    }
  });
  return result;
}

queryLocation.on('changed.bs.select', (e, clickedIndex, isSelected, previousValue) => {
  const net = $(e.currentTarget);
  vrfContainer.empty().removeClass('col');
  const queryLocationIds = net.val();
  if (Array.isArray(queryLocationIds) && (queryLocationIds.length)) {
    const queryLocationNet = net[0][clickedIndex].dataset.netname;
    const selectedVrfs = () => {
      const allVrfs = [];
      $.each(queryLocationIds, (i, loc) => {
        const locVrfs = cfgNetworks[queryLocationNet][loc].vrfs;
        allVrfs.push(new Set(locVrfs));
      });
      return allVrfs;
    };
    const intersectingVrfs = Array.from(findIntersection(...selectedVrfs()));
    console.log(intersectingVrfs);
    // Add the VRF select element
    if (vrfContainer.find('#query_vrf').length === 0) {
      vrfContainer.addClass('col').html(vrfSelect(cfgBranding.text.vrf));
    }
    // Build the select options for each VRF in array
    const vrfHtmlList = [];
    $.each(intersectingVrfs, (i, vrf) => {
      vrfHtmlList.push(vrfOption(vrf));
    });
    // Add the options to the VRF select element, enable it, initialize Bootstrap Select
    vrfContainer.find('#query_vrf').html(vrfHtmlList.join('')).removeAttr('disabled').selectpicker({
      iconBase: '',
      liveSearch: false,
      style: '',
      styleBase: 'form-control',
    });
    if (intersectingVrfs.length === 0) {
      vrfContainer.find('#query_vrf').selectpicker('destroy');
      vrfContainer.find('#query_vrf').prop('title', inputMessages.no_matching_vrfs).prop('disabled', true);
      vrfContainer.find('#query_vrf').selectpicker({
        iconBase: '',
        liveSearch: false,
        style: '',
        styleBase: 'form-control',
      });
    }
  }
});

queryTargetAppend.on('click', '.hg-info-btn', () => {
  const queryTypeId = $('.hg-info-btn').data('hg-type');
  $(`#hg-info-${queryTypeId}`).modal('show');
});

$('#hg-row-2').find('#query_vrf').on('hidden.bs.select', (e) => {
  $(e.currentTarget).nextAll('.form-control.dropdown-toggle').blur();
});

const queryApp = (queryType, queryTypeName, locationList, queryTarget, queryVrf) => {
  const resultsTitle = `${queryTypeName} Query for ${queryTarget}`;

  $('#hg-results-title').html(resultsTitle);

  submitIcon.empty().removeClass('hg-loading').html('<i class="remixicon-search-line"></i>');

  $.each(locationList, (n, loc) => {
    const locationName = $(`#${loc}`).data('display-name');
    const networkName = $(`#${loc}`).data('netname');

    const contentHtml = `
    <div class="card" id="${loc}-output">
      <div class="card-header bg-overlay" id="${loc}-heading">
        <div class="float-right hg-status-container" id="${loc}-status-container">
          <button type="button" class="float-right btn btn-loading btn-lg hg-menu-btn hg-status-btn" 
            data-location="${loc}" id="${loc}-status-btn" disabled>
          </button>
        </div>
        <button type="button" class="float-right btn btn-loading btn-lg hg-menu-btn hg-copy-btn" 
          data-clipboard-target="#${loc}-text" id="${loc}-copy-btn" disabled>
          <i class="remixicon-checkbox-multiple-blank-line hg-menu-icon hg-copy hg-copy-icon"></i>
        </button>
        <h2 class="mb-0" id="${loc}-heading-container">
          <button class="btn btn-link" type="button" data-toggle="collapse" 
            data-target="#${loc}-content" aria-expanded="true" aria-controls="${loc}-content"
            id="${loc}-heading-text">
          </button>
        </h2>
      </div>
      <div class="collapse" id="${loc}-content" aria-labelledby="${loc}-heading" data-parent="#hg-accordion">
        <div class="card-body" id="${loc}-text">
        </div>
      </div>
    </div>
    `;

    if ($(`#${loc}-output`).length) {
      $(`#${loc}-output`).replaceWith(contentHtml);
    } else {
      $('#hg-accordion').append(contentHtml);
    }
    const iconLoading = `<i id="${loc}-spinner" class="hg-menu-icon hg-status-icon remixicon-loader-4-line text-secondary"></i>`;

    $(`#${loc}-heading-text`).text(locationName);
    $(`#${loc}-status-container`)
      .addClass('hg-loading')
      .find('.hg-status-btn')
      .empty()
      .html(iconLoading);

    const generateError = (errorClass, locError, text) => {
      const iconError = '<i class="hg-menu-icon hg-status-icon remixicon-alert-line"></i>';
      $(`#${locError}-heading`).removeClass('bg-overlay').addClass(`bg-${errorClass}`);
      $(`#${locError}-heading`).find('.hg-menu-btn').removeClass('btn-loading').addClass(`btn-${errorClass}`);
      $(`#${locError}-status-container`)
        .removeClass('hg-loading')
        .find('.hg-status-btn')
        .empty()
        .html(iconError)
        .addClass('hg-done');
      $(`#${locError}-text`).html(text);
    };

    const timeoutError = (locError, text) => {
      const iconTimeout = '<i class="remixicon-time-line"></i>';
      $(`#${locError}-heading`).removeClass('bg-overlay').addClass('bg-warning');
      $(`#${locError}-heading`).find('.hg-menu-btn').removeClass('btn-loading').addClass('btn-warning');
      $(`#${locError}-status-container`).removeClass('hg-loading').find('.hg-status-btn').empty()
        .html(iconTimeout)
        .addClass('hg-done');
      $(`#${locError}-text`).empty().html(text);
    };

    $.ajax({
      url: '/query',
      method: 'POST',
      data: JSON.stringify({
        query_location: loc,
        query_type: queryType,
        query_target: queryTarget,
        query_vrf: queryVrf,
        response_format: 'html',
      }),
      contentType: 'application/json; charset=utf-8',
      context: document.body,
      async: true,
      timeout: cfgGeneral.request_timeout * 1000,
    })
      .done((data, textStatus, jqXHR) => {
        const displayHtml = `<pre>${data.output}</pre>`;
        const iconSuccess = '<i class="hg-menu-icon hg-status-icon remixicon-check-line"></i>';
        $(`#${loc}-heading`).removeClass('bg-overlay').addClass('bg-primary');
        $(`#${loc}-heading`).find('.hg-menu-btn').removeClass('btn-loading').addClass('btn-primary');
        $(`#${loc}-status-container`)
          .removeClass('hg-loading')
          .find('.hg-status-btn')
          .empty()
          .html(iconSuccess)
          .addClass('hg-done');
        $(`#${loc}-text`).empty().html(displayHtml);
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        const statusCode = jqXHR.status;
        if (textStatus === 'timeout') {
          timeoutError(loc, inputMessages.request_timeout);
        } else if (jqXHR.status === 429) {
          resetResults();
          $('#hg-ratelimit-query').modal('show');
        } else if (statusCode === 500 && textStatus !== 'timeout') {
          timeoutError(loc, inputMessages.request_timeout);
        } else if ((jqXHR.responseJSON.alert === 'danger') || (jqXHR.responseJSON.alert === 'warning')) {
          generateError(jqXHR.responseJSON.alert, loc, jqXHR.responseJSON.output);
        }
      })
      .always(() => {
        $(`#${loc}-status-btn`).removeAttr('disabled');
        $(`#${loc}-copy-btn`).removeAttr('disabled');
      });
    $(`#${locationList[0]}-content`).collapse('show');
  });
};

$(document).on('InvalidInputEvent', (e, domField) => {
  const errorField = $(domField);
  if (errorField.hasClass('is-invalid')) {
    errorField.on('keyup', () => {
      errorField.removeClass('is-invalid');
      errorField.nextAll('.invalid-feedback').remove();
    });
  }
});


// Submit Form Action
$('#lgForm').on('submit', (e) => {
  e.preventDefault();
  submitIcon.empty().html('<i class="remixicon-loader-4-line"></i>').addClass('hg-loading');
  const queryType = $('#query_type').val();
  const queryLocation = $('#location').val();
  const queryTarget = $('#query_target').val();
  const queryVrf = $('#query_vrf').val() || null;

  try {
    // message, thing to circle in red, place to put error text
    if (!queryTarget) {
      const queryTargetContainer = $('#query_target');
      throw new InputInvalid(inputMessages.no_input, queryTargetContainer, queryTargetContainer.parent());
    }
    if (!queryType) {
      const queryTypeContainer = $('#query_type').next('.dropdown-toggle');
      throw new InputInvalid(inputMessages.no_query_type, queryTypeContainer, queryTypeContainer.parent());
    }
    if (queryLocation === undefined || queryLocation.length === 0) {
      const queryLocationContainer = $('#location').next('.dropdown-toggle');
      throw new InputInvalid(inputMessages.no_location, queryLocationContainer, queryLocationContainer.parent());
    }
  } catch (err) {
    err.field.addClass('is-invalid');
    err.container.append(`<div class="invalid-feedback px-1">${err.message}</div>`);
    submitIcon.empty().removeClass('hg-loading').html('<i class="remixicon-search-line"></i>');
    $(document).trigger('InvalidInputEvent', err.field);
    return false;
  }
  const queryTypeTitle = $(`#${queryType}`).data('display-name');
  queryApp(queryType, queryTypeTitle, queryLocation, queryTarget, queryVrf);
  $('#hg-form').animsition('out', $('#hg-results'), '#');
  $('#hg-form').hide();
  swapSpacing('results');
  $('#hg-results').show();
  $('#hg-results').animsition('in');
  $('#hg-submit-spinner').remove();
  $('#hg-back-btn').removeClass('d-none');
  $('#hg-back-btn').animsition('in');
});

$('#hg-back-btn').click(() => {
  resetResults();
});

const clipboard = new ClipboardJS('.hg-copy-btn');
clipboard.on('success', (e) => {
  const copyIcon = $(e.trigger).find('.hg-copy-icon');
  copyIcon.removeClass('remixicon-checkbox-multiple-blank-line').addClass('remixicon-checkbox-multiple-line');
  e.clearSelection();
  setTimeout(() => {
    copyIcon.removeClass('remixicon-checkbox-multiple-line').addClass('remixicon-checkbox-multiple-blank-line');
  }, 800);
});
clipboard.on('error', (e) => {
  console.log(e);
});

$('#hg-accordion').on('mouseenter', '.hg-done', (e) => {
  $(e.currentTarget)
    .find('.hg-status-icon')
    .addClass('remixicon-repeat-line');
});

$('#hg-accordion').on('mouseleave', '.hg-done', (e) => {
  $(e.currentTarget)
    .find('.hg-status-icon')
    .removeClass('remixicon-repeat-line');
});

$('#hg-accordion').on('click', '.hg-done', (e) => {
  const thisLocation = $(e.currentTarget).data('location');
  console.log(`Refreshing ${thisLocation}`);
  const queryType = $('#query_type').val();
  const queryTypeTitle = $(`#${queryType}`).data('display-name');
  const queryTarget = $('#query_target').val();


  queryApp(queryType, queryTypeTitle, [thisLocation], queryTarget);
});

$('#hg-ratelimit-query').on('shown.bs.modal', () => {
  $('#hg-ratelimit-query').trigger('focus');
});

$('#hg-ratelimit-query').find('btn').on('click', () => {
  $('#hg-ratelimit-query').modal('hide');
});
