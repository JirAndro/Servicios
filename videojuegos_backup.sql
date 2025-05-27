-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
--
-- Host: localhost    Database: videojuegos
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Categorias`
--

DROP TABLE IF EXISTS `Categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Categorias`
--

LOCK TABLES `Categorias` WRITE;
/*!40000 ALTER TABLE `Categorias` DISABLE KEYS */;
INSERT INTO `Categorias` VALUES (1,'Acción','Juegos enfocados en combate y reflejos rápidos.'),(2,'RPG','Juegos de rol con desarrollo de personajes e historias complejas.'),(3,'Estrategia','Juegos que requieren planificación y tácticas para ganar.'),(4,'Aventura','Juegos con énfasis en la exploración y resolución de puzzles.'),(5,'Deportes','Simulaciones de deportes reales o ficticios.');
/*!40000 ALTER TABLE `Categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DetallesPedido`
--

DROP TABLE IF EXISTS `DetallesPedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DetallesPedido` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedidoId` int NOT NULL,
  `productoId` int NOT NULL,
  `cantidad` int NOT NULL,
  `precioUnitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pedidoId` (`pedidoId`),
  KEY `productoId` (`productoId`),
  CONSTRAINT `DetallesPedido_ibfk_1` FOREIGN KEY (`pedidoId`) REFERENCES `Pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DetallesPedido_ibfk_2` FOREIGN KEY (`productoId`) REFERENCES `Productos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DetallesPedido`
--

LOCK TABLES `DetallesPedido` WRITE;
/*!40000 ALTER TABLE `DetallesPedido` DISABLE KEYS */;
INSERT INTO `DetallesPedido` VALUES (1,3,6,1,1399.00,1399.00),(2,3,7,2,1199.00,2398.00);
/*!40000 ALTER TABLE `DetallesPedido` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Pedidos`
--

DROP TABLE IF EXISTS `Pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuarioId` int NOT NULL,
  `fechaPedido` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` varchar(50) DEFAULT 'pendiente_pago',
  `direccionEnvio` json DEFAULT NULL,
  `totalPedido` decimal(10,2) NOT NULL,
  `metodoPago` varchar(50) DEFAULT NULL,
  `idTransaccionPasarela` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuarioId` (`usuarioId`),
  CONSTRAINT `Pedidos_ibfk_1` FOREIGN KEY (`usuarioId`) REFERENCES `Usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Pedidos`
--

LOCK TABLES `Pedidos` WRITE;
/*!40000 ALTER TABLE `Pedidos` DISABLE KEYS */;
INSERT INTO `Pedidos` VALUES (1,1,'2025-05-21 02:14:11','pagado',NULL,2698.00,'paypal',NULL),(2,2,'2025-05-21 02:14:11','pendiente_pago',NULL,999.00,'mercadopago',NULL),(3,6,'2025-05-23 02:21:12','pagado','{\"pais\": \"EEUU\", \"calle\": \"Av. Siempre Viva 742\", \"ciudad\": \"Springfield\", \"codigoPostal\": \"12345\"}',3797.00,'tarjeta_simulada','0T1088838X5762933');
/*!40000 ALTER TABLE `Pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Productos`
--

DROP TABLE IF EXISTS `Productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text,
  `precio` decimal(10,2) NOT NULL,
  `stock` int DEFAULT '0',
  `plataforma` varchar(100) DEFAULT NULL,
  `genero` varchar(100) DEFAULT NULL,
  `fechaLanzamiento` date DEFAULT NULL,
  `desarrollador` varchar(255) DEFAULT NULL,
  `clasificacion` varchar(50) DEFAULT NULL,
  `imagenUrl` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `categoriaId` int DEFAULT NULL,
  `fechaCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaActualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `categoriaId` (`categoriaId`),
  CONSTRAINT `Productos_ibfk_1` FOREIGN KEY (`categoriaId`) REFERENCES `Categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Productos`
--

LOCK TABLES `Productos` WRITE;
/*!40000 ALTER TABLE `Productos` DISABLE KEYS */;
INSERT INTO `Productos` VALUES (6,'The Last of Us Part I','Remake del aclamado juego de supervivencia y drama.',1399.00,49,'PS5','Acción-Aventura','2022-09-02','Naughty Dog','M','https://placehold.co/300x400/000000/FFFFFF?text=Last+Of+Us',1,4,'2025-05-21 02:17:58','2025-05-23 02:21:12'),(7,'Elden Ring','Vasto RPG de acción en un mundo oscuro de fantasía.',1199.00,28,'PC','RPG','2022-02-25','FromSoftware','M','https://placehold.co/300x400/222222/FFFFFF?text=Elden+Ring',1,2,'2025-05-21 02:17:58','2025-05-23 02:21:12'),(8,'FIFA 23','Última entrega del popular simulador de fútbol.',999.00,100,'Xbox Series X','Deportes','2022-09-30','EA Sports','E','https://placehold.co/300x400/333333/FFFFFF?text=FIFA+23',1,5,'2025-05-21 02:17:58','2025-05-21 02:17:58'),(9,'God of War Ragnarök','Secuela de la épica aventura nórdica de Kratos.',1499.00,40,'PS5','Acción-Aventura','2022-11-09','Santa Monica Studio','M','https://placehold.co/300x400/111111/FFFFFF?text=GoW+Ragnarok',1,4,'2025-05-21 02:17:58','2025-05-21 02:17:58'),(10,'StarCraft II: Legacy of the Void','Expansión final del aclamado juego de estrategia en tiempo real.',399.00,75,'PC','Estrategia','2015-11-10','Blizzard Entertainment','T','https://placehold.co/300x400/444444/FFFFFF?text=StarCraft+II',1,3,'2025-05-21 02:17:58','2025-05-21 02:17:58'),(11,'Juego Creado por Andro Admin','Este juego fue creado por el admin Andro.',1250.00,30,'PC','Estrategia',NULL,NULL,NULL,NULL,1,3,'2025-05-22 03:17:14','2025-05-22 03:17:14');
/*!40000 ALTER TABLE `Productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Usuarios`
--

DROP TABLE IF EXISTS `Usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` varchar(50) DEFAULT 'cliente',
  `fechaRegistro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Usuarios`
--

LOCK TABLES `Usuarios` WRITE;
/*!40000 ALTER TABLE `Usuarios` DISABLE KEYS */;
INSERT INTO `Usuarios` VALUES (1,'Carlos Villa','carlos.villa@example.com','password123','cliente','2025-05-21 02:05:05'),(2,'Ana López','ana.lopez@example.com','password456','cliente','2025-05-21 02:05:05'),(3,'Admin User','admin@example.com','adminpass','admin','2025-05-21 02:05:05'),(4,'Akko Empleada','akko@example.com','akkopass','empleado','2025-05-21 02:05:05'),(5,'Usuario de Prueba','prueba@example.com','$2b$08$lFuZuvhcEgtVDE9NDmtCFOPj67pFVYuqztrgpZrkhk4okN83jqWgy','cliente','2025-05-22 02:40:40'),(6,'Andro','andro.nuevo@example.com','$2b$08$6Xnk2hjIvMbaADpzbCKzHedLLrXdAeXxnMZPMYlCAQA72W5JUg7Pm','admin','2025-05-22 03:13:49');
/*!40000 ALTER TABLE `Usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-27  5:15:36
