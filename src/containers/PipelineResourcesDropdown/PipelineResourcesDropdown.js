/*
Copyright 2019-2022 The Tekton Authors
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
import { useIntl } from 'react-intl';
import { ALL_NAMESPACES } from '@tektoncd/dashboard-utils';
import { TooltipDropdown } from '@tektoncd/dashboard-components';

import { usePipelineResources, useSelectedNamespace } from '../../api';

function PipelineResourcesDropdown({
  label,
  namespace: namespaceProp,
  type,
  ...rest
}) {
  const intl = useIntl();
  const { selectedNamespace } = useSelectedNamespace();
  const namespace = namespaceProp || selectedNamespace;

  const { data: pipelineResources = [], isFetching } = usePipelineResources({
    namespace
  });

  const items = pipelineResources
    .filter(pipelineResource => !type || type === pipelineResource.spec.type)
    .map(pipelineResource => pipelineResource.metadata.name);

  let emptyText = intl.formatMessage({
    id: 'dashboard.pipelineResourcesDropdown.empty.allNamespaces',
    defaultMessage: 'No PipelineResources found'
  });
  if (type && namespace !== ALL_NAMESPACES) {
    emptyText = intl.formatMessage(
      {
        id: 'dashboard.pipelineResourcesDropdown.empty.selectedNamespace.type',
        defaultMessage:
          "No PipelineResources found of type ''{type}'' in the ''{namespace}'' namespace"
      },
      {
        namespace,
        type
      }
    );
  } else if (type) {
    emptyText = intl.formatMessage(
      {
        id: 'dashboard.pipelineResourcesDropdown.empty.allNamespaces.type',
        defaultMessage: "No PipelineResources found of type ''{type}''"
      },
      { type }
    );
  } else if (namespace !== ALL_NAMESPACES) {
    emptyText = intl.formatMessage(
      {
        id: 'dashboard.pipelineResourcesDropdown.empty.selectedNamespace',
        defaultMessage:
          "No PipelineResources found in the ''{namespace}'' namespace"
      },
      { namespace }
    );
  }

  const labelString =
    label ||
    intl.formatMessage({
      id: 'dashboard.pipelineResourcesDropdown.label',
      defaultMessage: 'Select PipelineResource'
    });

  return (
    <TooltipDropdown
      {...rest}
      emptyText={emptyText}
      items={items}
      label={labelString}
      loading={isFetching}
    />
  );
}

PipelineResourcesDropdown.defaultProps = {
  titleText: 'PipelineResource'
};

export default PipelineResourcesDropdown;
