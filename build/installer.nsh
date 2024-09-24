!macro customHeader
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend

!macro customInit
  MessageBox MB_OK "请注意：安装路径不能包含中文字符。请选择一个不包含中文的路径。$\n$\n"
!macroend

