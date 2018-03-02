function switchMainView (view) {
  $('div.main-view').filter('#' + view).removeClass('d-none')
  $('div.main-view').not('#' + view).addClass('d-none')
}
