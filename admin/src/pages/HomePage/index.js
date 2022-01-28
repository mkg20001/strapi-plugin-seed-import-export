/*
 *
 * HomePage
 *
 */

import React, { memo, useEffect } from 'react'
// import PropTypes from 'prop-types';
import pluginId from '../../pluginId'
import getTrad from '../../utils/getTrad'
import { useIntl } from 'react-intl'
import PropTypes from 'prop-types';

import {
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  NoPermissions,
  AnErrorOccurred,
  SearchURLQuery,
  useSelectionState,
  useQueryParams,
  useNotification
} from '@strapi/helper-plugin'

import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box'
import { Divider } from '@strapi/design-system/Divider'
import { Select, Option } from '@strapi/design-system/Select'
import { Typography } from '@strapi/design-system/Typography'
import { Stack } from '@strapi/design-system/Stack'
import { Layout, HeaderLayout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout'
import { Main } from '@strapi/design-system/Main'
import { useNotifyAT } from '@strapi/design-system/LiveRegions'
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';

import FileSaver from 'file-saver';
import sanitize from 'sanitize-filename'

import axios from '../../utils/axiosInstance'
import { useQuery } from 'react-query'
const LRes = (url) => {
  const { notifyStatus } = useNotifyAT()
  const { formatMessage } = useIntl()
  const toggleNotification = useNotification()

  const getData = async () => {
    const { data } = await axios.get(url)
    return data
  }

  const { data, error, isLoading } = useQuery([url], getData, {
    staleTime: 0,
    cacheTime: 0
  })

  useEffect(() => {
    if (data) {
      notifyStatus(
        formatMessage({
          id: 'list.exportable.at.finished',
          defaultMessage: 'The exportables have finished loading.'
        })
      )
    }
  }, [data, notifyStatus, formatMessage])

  useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' }
      })
    }
  }, [error, toggleNotification])

  return { data, error, isLoading }
}

async function exportModels(models, populate = false) {
  const {data}=await axios({
    method: 'post',
    url: '/strapi-plugin-seed-import-export/export',
    body: {
      models,
      populate
    },
    responseType: 'blob',
  })

  FileSaver.saveAs(data, sanitize(models.length === 1 ? `${models[0]}.zip` : 'strapi_seed.zip'));
}

const Exportable = ({
  exportable,
  isSelected,
  onSelect
}) => {
  const { formatMessage } = useIntl()

  return (
    <div>
    <BaseCheckbox
      value={isSelected}
      onChange={() => onSelect(exportable.id)}
    />

      <h1>{exportable.info.displayName}</h1>
      <h2>Export {exportable.kind === 'collectionType' ? `all ${exportable.info.pluralName}` : exportable.info.displayName}</h2>
      <Button
        onClick={() => exportModels([exportable.id])}
      >
        {formatMessage({
          id: getTrad('export'),
          defaultMessage: 'Export',
        })}
      </Button>
    </div>
  )
}

const ExportableList = ({
  exportables,
  onEditExportable,
  onSelectExportable,
  selectedexportables
}) => {
  const { formatMessage } = useIntl()

  return (
    <KeyboardNavigable tagName="exportable">
      {exportables.map((exportable, index) => {
        const isSelected = Boolean(
          selectedexportables.find(currentExportable => currentExportable.id === exportable.id)
        )

        return (
          <Exportable
            key={exportable.id}
            exportable={exportable}
            isSelected={isSelected}
            onSelect={() => onSelectExportable(exportable)}
          />
        )
      })}
      <Button
        onClick={() => exportModels(selectedexportables)}
      >
        {formatMessage({
          id: getTrad('export'),
          defaultMessage: 'Export',
        })}
      </Button>
    </KeyboardNavigable>
  )
}

ExportableList.defaultProps = {
}

ExportableList.propTypes = {
  exportables: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onEditExportable: PropTypes.func,
  onSelectExportable: PropTypes.func.isRequired,
  selectedexportables: PropTypes.arrayOf(PropTypes.shape({})).isRequired
}

const HomePage = function () {
  const { formatMessage } = useIntl()

  const res = LRes('/strapi-plugin-seed-import-export/exportables')

  const selectedexportables = []

  return (
    <Layout>
      <Main aria-busy={res.isLoading}>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('plugin.name'),
            defaultMessage: 'Seed Import/Export'
          })}
        />

        <ContentLayout>
          {res.isLoading && <LoadingIndicatorPage />}
          {res.data && <ExportableList
            exportables={res.data}
            selectedexportables={selectedexportables}
            onSelectExportable={as => (selectedexportables.push(as))}
            />}
        </ContentLayout>
      </Main>
    </Layout>
  )
}

export default memo(HomePage)
