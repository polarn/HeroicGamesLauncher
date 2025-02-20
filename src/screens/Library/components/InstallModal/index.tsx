import { getInstallInfo, getProgress, install } from 'src/helpers'
import React, { useContext, useEffect, useState } from 'react'

import './index.css'
import {
  AppSettings,
  GameStatus,
  InstallInfo,
  InstallProgress,
  Path
} from 'src/types'

import { UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

import { SDL_GAMES, SelectiveDownload } from './selective_dl'
import prettyBytes from 'pretty-bytes'
import { Checkbox } from '@material-ui/core'
import { IpcRenderer } from 'electron'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

type Props = {
  appName: string
  backdropClick: () => void
}

const storage: Storage = window.localStorage

export default function InstallModal({ appName, backdropClick }: Props) {
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress

  const { libraryStatus, handleGameStatus } = useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]
  const [gameInfo, setGameInfo] = useState({} as InstallInfo)
  const [installDlcs, setInstallDlcs] = useState(false)
  const [defaultPath, setDefaultPath] = useState('...')
  const [installPath, setInstallPath] = useState(
    previousProgress.folder || 'default'
  )

  const installFolder = gameStatus?.folder || installPath

  const haveSDL = Boolean(SDL_GAMES[appName])
  const mandatoryTags: Array<string> = haveSDL
    ? SDL_GAMES[appName]
        .filter((el: SelectiveDownload) => el.mandatory)
        .map((el: SelectiveDownload) => el.tags)
    : []
  const [sdlList, setSdlList] = useState([...mandatoryTags])

  const { t } = useTranslation('gamepage')

  async function handleInstall(path?: string) {
    backdropClick()
    return await install({
      appName,
      handleGameStatus,
      installPath: path || installFolder,
      isInstalling: false,
      previousProgress,
      progress: previousProgress,
      t,
      sdlList,
      installDlcs
    })
  }

  useEffect(() => {
    ipcRenderer
      .invoke('requestSettings', 'default')
      .then((config: AppSettings) => {
        setDefaultPath(config.defaultInstallPath)
        if (installPath === 'default') {
          setInstallPath(config.defaultInstallPath)
        }
      })
    return () => {
      ipcRenderer.removeAllListeners('requestSettings')
    }
  }, [appName, installPath])

  function handleSdl(tags: Array<string>) {
    let updatedList: Array<string> = [...sdlList]
    tags.forEach((tag) => {
      if (updatedList.includes(tag)) {
        return (updatedList = updatedList.filter((tagx) => {
          return tagx !== tag
        }))
      }
      return updatedList.push(tag)
    })
    setSdlList([...updatedList])
  }

  function handleDlcs() {
    setInstallDlcs(!installDlcs)
  }

  useEffect(() => {
    const getInfo = async () => {
      const gameInfo = await getInstallInfo(appName)
      setGameInfo(gameInfo)
    }
    getInfo()
  }, [appName])

  const haveDLCs = gameInfo?.game?.owned_dlc?.length > 0
  const DLCList = gameInfo?.game?.owned_dlc
  const downloadSize =
    gameInfo?.manifest?.download_size &&
    prettyBytes(Number(gameInfo?.manifest?.download_size))
  const installSize =
    gameInfo?.manifest?.disk_size &&
    prettyBytes(Number(gameInfo?.manifest?.disk_size))

  function getDownloadedProgress() {
    if (previousProgress.folder === installPath) {
      const currentStatus = `${getProgress(previousProgress)}%`
      return (
        <span className="smallMessage">{`${t(
          'status.totalDownloaded',
          'Total Downloaded'
        )} ${currentStatus}`}</span>
      )
    }
    return null
  }

  return (
    <span className="modalContainer">
      {gameInfo?.game?.title ? (
        <div className="modal">
          <span className="title">{gameInfo?.game?.title}</span>
          <div className="installInfo">
            <div className="itemContainer">
              <span className="item">
                <span className="sizeInfo">
                  {t('game.downloadSize', 'Download Size')}:
                </span>{' '}
                <span>{downloadSize}</span>
              </span>
              <span className="item">
                <span className="sizeInfo">
                  {t('game.installSize', 'Install Size')}:
                </span>{' '}
                <span>{installSize}</span>
              </span>
            </div>
            <span className="installPath">
              <span className="settingText">
                {t('install.path', 'Select Install Path')}:
              </span>
              <span>
                <input
                  data-testid="setinstallpath"
                  type="text"
                  value={installPath.replaceAll("'", '')}
                  className="settingSelect"
                  placeholder={defaultPath}
                  onChange={(event) => setInstallPath(event.target.value)}
                />
                <FontAwesomeIcon
                  onClick={() =>
                    ipcRenderer
                      .invoke('openDialog', {
                        buttonLabel: t('box.choose'),
                        properties: ['openDirectory'],
                        title: t('box.default-install-path')
                      })
                      .then(({ path }: Path) =>
                        setInstallPath(path ? `'${path}'` : defaultPath)
                      )
                  }
                  className="fontAwesome folder"
                  icon={faFolderOpen}
                />
              </span>
              {getDownloadedProgress()}
            </span>
            {haveDLCs && (
              <div className="itemContainer">
                <div className="itemTitle">{t('dlc.title', 'DLCs')}</div>
                {DLCList.map(({ app_name, title }) => (
                  <span key={app_name} className="itemName">
                    {title}
                  </span>
                ))}
                <span className="item">
                  <Checkbox
                    color="primary"
                    checked={installDlcs}
                    size="small"
                    onChange={() => handleDlcs()}
                  />
                  <span>{t('dlc.installDlcs', 'Install all DLCs')}</span>
                </span>
              </div>
            )}
            {haveSDL && (
              <div className="itemContainer">
                <p className="itemTitle">
                  {t('sdl.title', 'Select components to Install')}
                </p>
                {SDL_GAMES[appName].map(
                  ({ name, tags, mandatory }: SelectiveDownload) =>
                    !mandatory && (
                      <span key={name} className="item">
                        <Checkbox
                          color="primary"
                          checked={mandatory}
                          disabled={mandatory}
                          size="small"
                          onChange={() => handleSdl(tags)}
                        />
                        <span>{name}</span>
                      </span>
                    )
                )}
              </div>
            )}
          </div>
          <div className="buttonsContainer">
            <button
              onClick={() => handleInstall('import')}
              className={`button is-secondary outline`}
            >
              {t('button.import')}
            </button>
            <button
              onClick={() => handleInstall()}
              className={`button is-primary`}
            >
              {getDownloadedProgress()
                ? t('button.continue', 'Continue Download')
                : t('button.install')}
            </button>
          </div>
        </div>
      ) : (
        <UpdateComponent />
      )}
      <span className="backdrop" onClick={() => backdropClick()} />
    </span>
  )
}
