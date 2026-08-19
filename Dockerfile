FROM node:24-alpine as build
WORKDIR /app
COPY . .
# COPY ./tsconfig.json /app

# Expose the app port
#COPY . /ui
RUN npm install --legacy-peer-deps
RUN npm run build
# Start the app


FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY /nginx/ /etc/nginx/conf.d/
EXPOSE 80


# run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]