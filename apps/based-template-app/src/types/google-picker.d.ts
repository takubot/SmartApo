// Google Picker API の型定義
declare namespace google.picker {
  enum ViewId {
    SPREADSHEETS = "spreadsheets",
    RECENTLY_PICKED = "recently_picked",
  }

  enum Action {
    PICKED = "picked",
    CANCEL = "cancel",
  }

  enum Feature {
    NAV_HIDDEN = "navHidden",
    SUPPORT_DRIVES = "supportDrives",
  }

  interface ResponseObject {
    action: string;
    docs: Array<{
      id: string;
      name: string;
      mimeType: string;
      url: string;
    }>;
  }

  class DocsView {
    constructor(viewId?: ViewId);
    setIncludeFolders(include: boolean): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
    setMimeTypes(mimeTypes: string): DocsView;
  }

  class PickerBuilder {
    addView(view: DocsView | ViewId): PickerBuilder;
    enableFeature(feature: Feature): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setAppId(appId: string): PickerBuilder;
    setLocale(locale: string): PickerBuilder;
    setTitle(title: string): PickerBuilder;
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
    build(): Picker;
  }

  interface Picker {
    setVisible(visible: boolean): void;
  }
}

interface Window {
  gapi: {
    load: (api: string, callback: () => void) => void;
  };
  google: typeof google;
}
