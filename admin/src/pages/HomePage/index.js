/*
 *
 * HomePage
 *
 */

import React, { memo } from 'react';
// import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import { useIntl } from 'react-intl';

import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { Select, Option } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';

const HomePage = () => {
  const { formatMessage } = useIntl();

  return (
    <Box paddingTop={6}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Seed Import/Export' })}
      </Typography>
    </Box>
  );
};

export default memo(HomePage);
